// claim_scope: isolated_internal_engineering
// evidence_scope: internal_support_only
// interpretation_boundary: Detached worker transport, not live evidence or external validation.
import { assertData, freezeData, validateProtocol, verifyData } from './contracts.js';
import { verifyWorkbenchResult } from './resultVerifier.js';

export function createBrowserWorkbenchClient({workerFactory=()=>new Worker('/microExperiment.worker.js',{type:'module'}),setTimer=setTimeout,clearTimer=clearTimeout}={}) {
  let active=null,sequence=0;
  const cancel=()=>active?.finish(new Error('workbench_cancelled'));
  return {
    cancel,
    run(capture,protocol,{timeoutMs=120000}={}) {
      cancel();
      assertData(capture);validateProtocol(protocol);verifyData(capture,'qicn.workbench_capture.v1');
      if(!Number.isFinite(timeoutMs)||timeoutMs<1)throw new Error('invalid_worker_timeout');
      const captured=structuredClone(capture),spec=structuredClone(protocol),id=`workbench-${++sequence}`;
      return new Promise((resolve,reject)=>{
        let worker,timer,settled=false;
        const finish=(error,result)=>{
          if(settled)return;settled=true;clearTimer(timer);worker?.terminate();
          if(active?.id===id)active=null;
          error?reject(error):resolve(result);
        };
        active={id,finish};
        try {
          worker=workerFactory();
          worker.onmessage=({data})=>{
            if(settled)return;
            try {
              if(data?.id!==id)throw new Error('workbench_response_id_mismatch');
              if(data.type!=='workbench_result')throw new Error(data.error||'workbench_worker_protocol_error');
              if(data.workerBuild?.version!==captured.sourceBuild.version||data.workerBuild?.signature!==captured.sourceBuild.signature)throw new Error('workbench_worker_build_mismatch');
              verifyWorkbenchResult(data.result,captured,spec);
              finish(null,freezeData({capture:captured,protocol:spec,result:structuredClone(data.result)}));
            } catch(error){finish(error);}
          };
          worker.onerror=event=>finish(new Error(event.message||'workbench_worker_load_error'));
          worker.onmessageerror=()=>finish(new Error('workbench_worker_message_error'));
          timer=setTimer(()=>finish(new Error('workbench_timeout')),timeoutMs);
          worker.postMessage({type:'run_workbench',id,capture:captured,protocol:spec,expectedBuild:captured.sourceBuild});
        }catch(error){finish(error);}
      });
    }
  };
}
