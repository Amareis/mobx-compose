import {
  createElement,
  useRef,
  FunctionComponent,
  memo,
  useLayoutEffect,
  forwardRef,
  Ref,
  PropsWithoutRef,
  RefAttributes
} from "react";
import { Observer } from "mobx-react-lite";
import { runInAction, observable, computed, reaction, autorun } from "mobx";

function useProps<T extends object>(props: T): T {
  const res = useRef<T | null>(null);
  if (!res.current) res.current = observable(props, {}, { deep: false });
  else runInAction(() => Object.assign(res.current, props));
  return res.current;
}

//setup вызывается один раз на инстанс компонента
//props в setup реактивные
//props в render - обычные
//render - observer
//хуки в компоненте
//forward ref

let q: any = null;

let noop = () => {};

export function create<Props extends object = {}, TRef = null>(
  setup: TRef extends null
    ? (props: Props) => FunctionComponent<Props>
    : (props: Props, ref: Ref<TRef>) => FunctionComponent<Props>
): TRef extends null
  ? FunctionComponent<Props>
  : FunctionComponent<PropsWithoutRef<Props> & RefAttributes<TRef>> {
  function useRender(props: Props, ref?: Ref<TRef>) {
    const oProps = useProps(props);
    const render = useRef<FunctionComponent<Props> | null>(null);
    let cleanup = noop;
    if (!render.current) {
      let prevQ = q;
      q = { mount: [], unmount: [] };

      render.current = setup(oProps, ref as any);

      let qq = q;
      q = prevQ;

      cleanup = () => {
        qq.mount.forEach((cb: any) => cb());
        qq.mount = null;
        return () => {
          qq.unmount.forEach((cb: any) => cb());
          qq.unmount = null;
          setRef(ref!, null);
        };
      };
    }

    useLayoutEffect(cleanup, []);

    return createElement(Observer, undefined, () =>
      render.current!(props, ref)
    );
  }

  return memo(setup.length > 1 ? forwardRef(useRender) : useRender) as any;
}

export function setRef<TRef>(r: Ref<TRef>, val: TRef) {
  if (typeof r === "function") r(val);
  else if (r) (r as any).current = val;
}

export function ref<T>(current: T): { current: T } {
  return observable({ current });
}

export function value<T>(value: T): { value: T } {
  return observable({ value });
}

export function calc<T>(c: () => T): { readonly value: T } {
  const _c = computed(c);
  return {
    get value() {
      return _c.get();
    }
  };
}

export function onMount(cb: () => void) {
  if (!q) throw new Error("Need to call inside of create cb");
  q.mount.push(cb);
}

export function onUnmount(cb: () => void) {
  if (!q) throw new Error("Need to call inside of create cb");
  q.unmount.push(cb);
}

export const watch: typeof reaction = (...args) => {
  const clean = reaction(...args);
  onUnmount(clean);
  return clean;
};

export const effect: typeof autorun = (...args) => {
  const clean = autorun(...args);
  onUnmount(clean);
  return clean;
};
