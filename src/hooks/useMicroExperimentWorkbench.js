import { useState, useRef, useEffect, useCallback } from 'react';
import { createBrowserWorkbenchClient } from '../experiments/workbench/browserClient.js';
import { createWorkbenchProtocol } from '../experiments/workbench/contracts.js';
import { createSyntheticInputTape } from '../experiments/workbench/inputTape.js';
import { createEvidenceRegistry } from '../language/evidential/evidenceRegistry.js';

const DEFAULT_OPTIONS=Object.freeze({});
export function useMicroExperimentWorkbench(capture,options=DEFAULT_OPTIONS) {
  const [state,setState]=useState({status:'idle',bundle:null,error:null,evidenceStatus:'not_recorded'});
  const client=useRef(null),operation=useRef(0),captureRef=useRef(capture);
  captureRef.current=capture;
  const cancel=useCallback(()=>{operation.current++;client.current?.cancel();setState(prev=>({...prev,status:'cancelled'}));},[]);
  useEffect(()=>()=>{operation.current++;client.current?.cancel();},[]);
  const run=useCallback(async({profile='paired_intervention',ticks=12,seed=11,interventions=[],timeoutMs=120000}={})=>{
    const token=++operation.current;
    client.current?.cancel();setState({status:'capturing',bundle:null,error:null,evidenceStatus:'not_recorded'});
    try {
      const captured=await captureRef.current({seed,profile});
      if(token!==operation.current)return;
      const branches=[{id:'baseline',intervention:'sham'},{id:'sham',intervention:'sham'},...interventions.filter((value,index,array)=>value!=='sham'&&array.indexOf(value)===index).map(intervention=>({id:intervention,intervention}))];
      const protocol=createWorkbenchProtocol({profile,ticks,inputTape:createSyntheticInputTape(ticks,seed),branches});
      client.current=createBrowserWorkbenchClient(options);
      setState({status:'running',bundle:null,error:null,evidenceStatus:'not_recorded'});
      const bundle=await client.current.run(captured,protocol,{timeoutMs});
      if(token!==operation.current)return;
      const registry=createEvidenceRegistry([bundle]);
      setState({status:'completed',bundle,error:null,evidenceStatus:registry.status});
    }catch(error){if(token===operation.current)setState({status:error.message==='workbench_timeout'?'timed_out':'error',bundle:null,error:error.message,evidenceStatus:'not_recorded'});}
  },[options]);
  return {...state,run,cancel};
}
