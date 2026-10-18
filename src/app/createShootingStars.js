import * as THREE from "three";

// Occasional meteors across the sky, plus bursts on demand (moon easter egg).
export function createShootingStars(scene, { reduceMotion = false } = {}) {
  const active = [];
  let nextAt = 3;

  function spawn(burst = false) {
    const dir = new THREE.Vector3(
      -1 - Math.random(),
      -0.3 - Math.random() * 0.5,
      (Math.random() - 0.5) * 0.6,
    ).normalize();
    const start = burst
      ? new THREE.Vector3((Math.random() - 0.5) * 20 + 10, 6 + Math.random() * 8, -6 - Math.random() * 10)
      : new THREE.Vector3((Math.random() - 0.2) * 60, 14 + Math.random() * 18, -30 - Math.random() * 30);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(6), 3));
    // Head bright, tail black: with additive blending the tail fades out.
    geometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array([2, 1.9, 1.7, 0, 0, 0]), 3));
    const line = new THREE.Line(
      geometry,
      new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    line.frustumCulled = false;
    scene.add(line);
    active.push({
      line,
      start,
      dir,
      t: 0,
      life: 1.1 + Math.random() * 0.6,
      speed: burst ? 26 : 38,
      length: burst ? 4 : 7,
    });
  }

  const head = new THREE.Vector3();
  const tail = new THREE.Vector3();

  function update(dt, time) {
    if (!reduceMotion && time > nextAt) {
      spawn(false);
      nextAt = time + 4 + Math.random() * 7;
    }
    for (let i = active.length - 1; i >= 0; i--) {
      const s = active[i];
      s.t += dt;
      head.copy(s.start).addScaledVector(s.dir, s.t * s.speed);
      tail.copy(head).addScaledVector(s.dir, -s.length);
      const pos = s.line.geometry.attributes.position;
      pos.setXYZ(0, head.x, head.y, head.z);
      pos.setXYZ(1, tail.x, tail.y, tail.z);
      pos.needsUpdate = true;
      s.line.material.opacity = Math.sin(Math.min(1, s.t / s.life) * Math.PI);
      if (s.t > s.life) {
        scene.remove(s.line);
        s.line.geometry.dispose();
        s.line.material.dispose();
        active.splice(i, 1);
      }
    }
  }

  return {
    spawn,
    burst(count = 4) {
      if (reduceMotion) return;
      for (let k = 0; k < count; k++) setTimeout(() => spawn(true), k * 120);
    },
    update,
  };
}
