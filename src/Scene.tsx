import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { WIRES, type Params, type Reading, clamp } from "./model";
export type CameraView = "Angled" | "Side" | "Top" | "Along axis";
type Props = {
  p: Params;
  r: Reading;
  fieldLines: boolean;
  reduced: boolean;
  view: CameraView;
  resetKey: number;
  onMove: (x: number) => void;
  demoFrame?: number;
  demoDrag?: boolean;
};
function label(text: string, color = "#c9cec7", scale = 0.5) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 64;
  const ctx = c.getContext("2d")!;
  ctx.font = "28px Arial";
  ctx.textAlign = "center";
  ctx.fillStyle = color;
  ctx.fillText(text, 128, 44);
  const texture = new THREE.CanvasTexture(c);
  const s = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
    }),
  );
  s.scale.set(scale * 4, scale, 1);
  return s;
}
function disposeTree(root: THREE.Object3D) {
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.geometry) m.geometry.dispose();
    if (m.material) {
      for (const mat of Array.isArray(m.material) ? m.material : [m.material]) {
        (mat as THREE.MeshBasicMaterial).map?.dispose();
        mat.dispose();
      }
    }
  });
}
export function Scene(props: Props) {
  const host = useRef<HTMLDivElement>(null),
    latest = useRef(props),
    cameraApi = useRef<(v: CameraView) => void>(() => {});
  latest.current = props;
  const [error, setError] = useState(false);
  useEffect(() => {
    cameraApi.current(props.view);
  }, [props.view, props.resetKey]);
  useEffect(() => {
    const el = host.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    } catch {
      setError(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor("#101311");
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.55;
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2("#101311", 0.035);
    const camera = new THREE.PerspectiveCamera(39, 1, 0.1, 100);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.09;
    controls.minDistance = 5;
    controls.maxDistance = 22;
    controls.maxPolarAngle = Math.PI * 0.92;
    controls.target.set(0.8, 0, 0);
    cameraApi.current = (v) => {
      const targets: Record<CameraView, number[]> = {
        Angled: [7, 4.4, 9.8],
        Side: [0.8, 0.8, 12],
        Top: [0.8, 12, 0.01],
        "Along axis": [12, 0.25, 0.15],
      };
      camera.position.fromArray(targets[v]);
      camera.lookAt(controls.target);
      controls.update();
    };
    cameraApi.current(latest.current.view);
    scene.add(new THREE.HemisphereLight("#dcebf2", "#392014", 2.2));
    const key = new THREE.DirectionalLight("#ffe1be", 5);
    key.position.set(-2, 5, 5);
    scene.add(key);
    const fill = new THREE.DirectionalLight("#89d9e5", 3);
    fill.position.set(4, 1, -4);
    scene.add(fill);
    const grid = new THREE.GridHelper(36, 120, "#3b423c", "#232a25");
    grid.position.y = -1.12;
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.45;
    scene.add(grid);
    const ruler = new THREE.Group();
    for (let i = -3; i <= 3; i++) {
      const x = i * 1.5;
      const tick = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(x, -1.105, 0.6),
          new THREE.Vector3(x, -1.105, 0.8),
        ]),
        new THREE.LineBasicMaterial({
          color: "#68756a",
          transparent: true,
          opacity: 0.6,
        }),
      );
      ruler.add(tick);
      const t = label(`${i * 5} cm`, "#8a948c", 0.13);
      t.position.set(x, -1.09, 1.05);
      ruler.add(t);
    }
    scene.add(ruler);
    const coil = new THREE.Group();
    scene.add(coil);
    let geometryKey = "";
    const magnet = new THREE.Group();
    scene.add(magnet);
    const magnetMaterials = [
      new THREE.MeshStandardMaterial({
        color: "#bf4b43",
        metalness: 0.55,
        roughness: 0.32,
      }),
      new THREE.MeshStandardMaterial({
        color: "#286c9b",
        metalness: 0.55,
        roughness: 0.32,
      }),
    ];
    for (let i = 0; i < 2; i++) {
      const m = new THREE.Mesh(
        new THREE.CylinderGeometry(0.19, 0.19, 0.46, 32),
        magnetMaterials[i],
      );
      m.rotation.z = Math.PI / 2;
      m.position.x = i === 0 ? 0.23 : -0.23;
      magnet.add(m);
    }
    const n = label("N", "#f4e9d7", 0.18);
    n.position.set(0.25, 0.38, 0);
    const s = label("S", "#dae8ed", 0.18);
    s.position.set(-0.25, 0.38, 0);
    magnet.add(n, s);
    const magnetHalo = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.22, 0.95, 24),
      new THREE.MeshBasicMaterial({
        color: "#a7d7c0",
        transparent: true,
        opacity: 0.08,
        depthWrite: false,
      }),
    );
    magnetHalo.rotation.z = Math.PI / 2;
    magnet.add(magnetHalo);
    const dragRing = new THREE.Mesh(
      new THREE.RingGeometry(.27, .30, 48),
      new THREE.MeshBasicMaterial({ color: '#f1efc9', transparent: true, opacity: .8, side: THREE.DoubleSide, depthTest: false }),
    );
    dragRing.renderOrder = 10;
    scene.add(dragRing);
    const lineMaterials: LineMaterial[] = [];
    const fieldLine = (points: THREE.Vector3[], colors: number[]) => {
      const geometry = new LineGeometry();
      geometry.setPositions(points.flatMap((p) => [p.x, p.y, p.z]));
      geometry.setColors(colors);
      const material = new LineMaterial({
        vertexColors: true,
        linewidth: 0.55,
        toneMapped: false,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
      });
      material.resolution.set(el.clientWidth, el.clientHeight);
      lineMaterials.push(material);
      return new Line2(geometry, material);
    };
    const field = new THREE.Group();
    scene.add(field);
    const paths: {
      curve: THREE.CatmullRomCurve3;
      dot: THREE.Mesh;
      phase: number;
    }[] = [];
    for (let ring = 0; ring < 6; ring++)
      for (let plane = 0; plane < 3; plane++) {
        const R = 1.05 + ring * 0.76,
          azimuth = (plane * Math.PI) / 3 + 0.13;
        const points = [];
        const colors = [];
        for (let i = 0; i <= 120; i++) {
          const t = 0.035 + ((Math.PI - 0.07) * i) / 120;
          const rr = R * Math.sin(t) ** 2;
          points.push(
            new THREE.Vector3(
              rr * Math.cos(t) * 1.55,
              rr * Math.sin(t) * Math.cos(azimuth) * 0.72,
              rr * Math.sin(t) * Math.sin(azimuth) * 0.72,
            ),
          );
          const color = new THREE.Color().lerpColors(
            new THREE.Color("#77d4ca"),
            new THREE.Color("#a897d1"),
            Math.min(1, rr / 3.8),
          );
          colors.push(color.r, color.g, color.b);
        }
        const curve = new THREE.CatmullRomCurve3(points);
        field.add(fieldLine(points, colors));
        const mirrored = points.map((v) => new THREE.Vector3(v.x, -v.y, -v.z));
        field.add(fieldLine(mirrored, colors));
        for (const c of [curve, new THREE.CatmullRomCurve3(mirrored)]) {
          const dot = new THREE.Mesh(
            new THREE.SphereGeometry(0.014, 6, 6),
            new THREE.MeshBasicMaterial({ color: "#c5f3df" }),
          );
          field.add(dot);
          paths.push({
            curve: c,
            dot,
            phase: (ring * 0.13 + plane * 0.19) % 1,
          });
        }
      }
    const coilField = new THREE.Group();
    scene.add(coilField);
    for (let i = 0; i < 9; i++) {
      const theta = (i / 9) * Math.PI * 2;
      const points = [];
      for (let j = 0; j <= 100; j++) {
        const t = (j / 100) * Math.PI * 2;
        points.push(
          new THREE.Vector3(
            Math.cos(t) * 2.3,
            Math.sin(t) * 1.4 * Math.cos(theta),
            Math.sin(t) * 1.4 * Math.sin(theta),
          ),
        );
      }
      coilField.add(
        new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(points),
          new THREE.LineBasicMaterial({
            color: "#c9ba73",
            transparent: true,
            opacity: 0.19,
          }),
        ),
      );
    }
    const arrow = new THREE.ArrowHelper(
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(0, 0.5, 0),
      1,
      "#d7c88b",
      0.13,
      0.08,
    );
    scene.add(arrow);
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let dragging = false;
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0),
      hit = new THREE.Vector3();
    const setPointer = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        (-(e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
    };
    const down = (e: PointerEvent) => {
      setPointer(e);
      if (raycaster.intersectObject(magnet, true).length) {
        dragging = true;
        controls.enabled = false;
        el.classList.add("dragging");
        renderer.domElement.setPointerCapture(e.pointerId);
        plane.setFromNormalAndCoplanarPoint(
          camera.getWorldDirection(new THREE.Vector3()),
          magnet.position,
        );
      }
    };
    const move = (e: PointerEvent) => {
      setPointer(e);
      if (dragging) {
        if (raycaster.ray.intersectPlane(plane, hit))
          latest.current.onMove(clamp(hit.x / 30, -0.15, 0.15));
      } else {
        el.style.cursor = raycaster.intersectObject(magnet, true).length
          ? "grab"
          : "default";
      }
    };
    const up = () => {
      dragging = false;
      controls.enabled = true;
      el.classList.remove("dragging");
    };
    renderer.domElement.addEventListener("pointerdown", down, true);
    renderer.domElement.addEventListener("pointermove", move);
    renderer.domElement.addEventListener("pointerup", up);
    renderer.domElement.addEventListener("pointercancel", up);
    const resize = new ResizeObserver(() => {
      const w = el.clientWidth,
        h = el.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      for (const material of lineMaterials) material.resolution.set(w, h);
    });
    resize.observe(el);
    let id = 0;
    const render = () => {
      const { p, r, fieldLines, reduced } = latest.current;
      const gkey = `${p.turns}-${p.wire}-${p.core}`;
      if (gkey !== geometryKey) {
        disposeTree(coil);
        coil.clear();
        const material = new THREE.MeshStandardMaterial({
          color: WIRES[p.wire].color,
          metalness: 0.87,
          roughness: 0.25,
        });
        const loops = Math.round(10 + p.turns / 16);
        for (let i = 0; i < loops; i++) {
          const rad = 0.7 + (i % 3) * 0.035;
          const ring = new THREE.Mesh(
            new THREE.TorusGeometry(rad, 0.025, 8, 96),
            material,
          );
          ring.rotation.y = Math.PI / 2;
          ring.position.x = (i / (loops - 1) - 0.5) * 0.4;
          coil.add(ring);
        }
        for (const x of [-0.27, 0.27]) {
          const rim = new THREE.Mesh(
            new THREE.TorusGeometry(0.72, 0.09, 12, 96),
            new THREE.MeshStandardMaterial({
              color: p.core ? "#7b8180" : "#775139",
              metalness: 0.6,
              roughness: 0.5,
            }),
          );
          rim.rotation.y = Math.PI / 2;
          rim.position.x = x;
          coil.add(rim);
        }
        const cl = label("COIL  /  " + p.turns + " TURNS", "#999d91", 0.12);
        cl.position.set(0, -0.98, -0.3);
        coil.add(cl);
        geometryKey = gkey;
      }
      coil.rotation.y = (p.angle * Math.PI) / 180;
      magnet.position.x = r.x * 30;
      magnet.rotation.y = p.polarity < 0 ? Math.PI : 0;
      dragRing.visible = !!latest.current.demoDrag;
      dragRing.position.copy(magnet.position);
      dragRing.quaternion.copy(camera.quaternion);
      field.position.x = magnet.position.x;
      field.rotation.y = p.polarity < 0 ? Math.PI : 0;
      field.visible = fieldLines;
      const strength = 0.75 + MAGNET_STRENGTH[p.magnet] * 0.25;
      field.scale.setScalar(strength);
      coilField.visible = fieldLines && Math.abs(r.current) > 0.015;
      coilField.rotation.y = coil.rotation.y;
      coilField.scale.setScalar(
        clamp(0.65 + Math.abs(r.current) * 0.3, 0.65, 1.7),
      );
      for (const path of paths) {
        path.dot.position.copy(
          path.curve.getPoint((path.phase + (reduced ? 0 : r.time * 0.11)) % 1),
        );
      }
      arrow.visible = Math.abs(r.force) > 0.0001;
      arrow.position.set(magnet.position.x, 0.65, 0);
      arrow.setDirection(new THREE.Vector3(Math.sign(r.force), 0, 0));
      arrow.setLength(clamp(Math.abs(r.force) * 50, 0.25, 1.4), 0.14, 0.07);
      controls.update();
      renderer.render(scene, camera);
      if (latest.current.demoFrame !== undefined) el.dataset.renderedFrame = String(latest.current.demoFrame);
      else delete el.dataset.renderedFrame;
      id = requestAnimationFrame(render);
    };
    render();
    const lost = (e: Event) => {
      e.preventDefault();
      setError(true);
    };
    renderer.domElement.addEventListener("webglcontextlost", lost);
    return () => {
      cancelAnimationFrame(id);
      resize.disconnect();
      controls.dispose();
      renderer.domElement.removeEventListener("pointerdown", down, true);
      renderer.domElement.removeEventListener("pointermove", move);
      renderer.domElement.removeEventListener("pointerup", up);
      renderer.domElement.removeEventListener("pointercancel", up);
      disposeTree(scene);
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);
  return (
    <div
      ref={host}
      className="scene-render"
      role="img"
      tabIndex={0}
      aria-label="Interactive three-dimensional coil and bar magnet. Arrow keys move the magnet; Space pauses; R resets. The position slider is also available."
    >
      {error && (
        <div className="webgl-fallback">
          3D view unavailable on this device.
          <br />
          <span>All controls, measurements and graphs remain interactive.</span>
        </div>
      )}
    </div>
  );
}
const MAGNET_STRENGTH = { N52: 1, N42: 0.93, SmCo: 0.79, C8: 0.28 };
