import * as React from "react";
import { render } from "react-dom";
import { observable, action } from "mobx";

import {
  create,
  ref,
  value,
  onMount,
  onUnmount,
  calc,
  watch,
  setRef,
  effect
} from "./lib";

const name1 = value("h");
const name2 = value("a");

function setupListener(
  target: EventTarget,
  event: string,
  handler: EventListener
) {
  onMount(() => target.addEventListener(event, handler));
  onUnmount(() => target.removeEventListener(event, handler));
}

function setupMouse(event = "mousemove") {
  const coords = observable({ x: 0, y: 0 });
  setupListener(window, event, action((e: MouseEvent) => {
    coords.x = e.pageX;
    coords.y = e.pageY;
  }) as any);
  return coords;
}

const Mouse = create<{}, number>((_, r) => {
  let coords = setupMouse("click");

  watch(
    () => [coords.x, coords.y],
    ([x, y]) => {
      console.log(x, y);
      setRef(r, x + y);
    }
  );

  return () => (
    <div>
      Last mouse coords: {coords.x} {coords.y} {console.log("render mouse")}
    </div>
  );
});

type CompRef = { triple: () => string };

const Comp = create<{ name: string }, CompRef>((p, r) => {
  console.log("setup", p.name, r);
  const rename = calc(() => p.name.toUpperCase());
  onMount(() => console.log("mount", p.name));
  onUnmount(() => console.log("unmount", p.name));

  setRef(r, {
    triple: () => p.name.repeat(3)
  });

  return function useHooks(p) {
    const [c, setC] = React.useState(0);
    console.log("render", p.name);
    return (
      <div>
        {p.name} {rename.value} {c}{" "}
        <button onClick={() => setC(c => c + 1)}>Inc by hooks</button>
      </div>
    );
  };
});

function setupState<T>(val: T) {
  const o = value(val);
  return Object.assign(o, {
    update(f: (oldVal: T) => T) {
      o.value = f(o.value);
    }
  });
}

function setupBool(val: boolean) {
  const o = setupState(false);
  return Object.assign(o, {
    switch() {
      o.update(on => !on);
    },
    on() {
      o.value = true;
    },
    off() {
      o.value = false;
    }
  });
}

const App = create(function App() {
  let r = ref<any>(null);
  effect(() => console.log("ref", r.current));
  function changeName() {
    name2.value = name2.value === "a" ? "b" : "a";
  }

  const showComp = setupBool(true);

  return () => (
    <>
      {showComp.value ? <Comp name={name1.value} ref={r} /> : <Mouse ref={r} />}
      <button onClick={showComp.switch}>Switch</button>
      <br />
      <br />
      <Comp name={name2.value} />
      <button onClick={changeName}>Change</button>
      {console.log("render app")}
    </>
  );
});

const rootElement = document.getElementById("root");
render(<App />, rootElement);
