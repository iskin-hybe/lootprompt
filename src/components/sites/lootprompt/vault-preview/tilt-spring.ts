// Pointer tilt for the vault preview. The source feeds the pointer offset
// through framer-motion springs (stiffness 80, damping 18, mass 0.6) and maps
// it onto one transform shared by the heading and the monitor.

const STIFFNESS = 80;
const DAMPING = 18;
const MASS = 0.6;
const REST_DELTA = 0.001;
const REST_SPEED = 0.01;
const MAX_STEP = 0.004;

interface Axis {
  value: number;
  velocity: number;
  target: number;
}

/** Transform for a normalised pointer offset (-1..1 on each axis). */
export function tiltTransform(x: number, y: number): string {
  return `rotateY(${-18 + x * 12}deg) rotateX(${3 - y * 7}deg) rotateZ(${-0.4 + x * 0.9}deg)`;
}

function step(axis: Axis, dt: number) {
  const force = -STIFFNESS * (axis.value - axis.target) - DAMPING * axis.velocity;
  axis.velocity += (force / MASS) * dt;
  axis.value += axis.velocity * dt;
}

function settled(axis: Axis) {
  return Math.abs(axis.value - axis.target) < REST_DELTA && Math.abs(axis.velocity) < REST_SPEED;
}

export interface TiltSpring {
  /** Elements that receive the tilt transform. */
  setNodes: (elements: HTMLElement[]) => void;
  setTarget: (x: number, y: number) => void;
  stop: () => void;
}

export function createTiltSpring(): TiltSpring {
  let nodes: HTMLElement[] = [];
  const x: Axis = { value: 0, velocity: 0, target: 0 };
  const y: Axis = { value: 0, velocity: 0, target: 0 };
  let frame = 0;
  let last = 0;

  const render = () => {
    const transform = tiltTransform(x.value, y.value);
    nodes.forEach((node) => {
      node.style.transform = transform;
    });
  };

  const tick = (now: number) => {
    // Integrate the real elapsed time (in small steps) so slow frames do not slow the spring.
    const dt = Math.min(Math.max(now - last, 0) / 1000, 1);
    last = now;
    const steps = Math.max(1, Math.ceil(dt / MAX_STEP));
    for (let i = 0; i < steps; i++) {
      step(x, dt / steps);
      step(y, dt / steps);
    }
    if (settled(x) && settled(y)) {
      x.value = x.target;
      y.value = y.target;
      x.velocity = 0;
      y.velocity = 0;
      render();
      frame = 0;
      return;
    }
    render();
    frame = window.requestAnimationFrame(tick);
  };

  return {
    setNodes: (elements) => {
      nodes = elements;
    },
    setTarget: (tx, ty) => {
      x.target = tx;
      y.target = ty;
      if (!frame) {
        last = performance.now();
        frame = window.requestAnimationFrame(tick);
      }
    },
    stop: () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
    },
  };
}
