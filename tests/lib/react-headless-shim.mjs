// Headless React shim for smoke-testing extracted hooks (no DOM, no dispatcher).
// useCallback(fn, deps) -> fn ; useRef(v) -> {current:v} ; useMemo(fn) -> fn() ; useState(v)->[v, ()=>{}] ; useEffect-> noop
export const useCallback = (fn) => fn;
export const useRef = (v = null) => ({ current: v });
export const useMemo = (fn) => fn();
export const useState = (v) => [typeof v === 'function' ? v() : v, () => {}];
export const useEffect = () => {};
export const useContext = () => ({});
export const createContext = () => ({ Provider: null, Consumer: null });
const React = { useCallback, useRef, useMemo, useState, useEffect, useContext, createContext };
export default React;