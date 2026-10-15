export async function mountGlobe(root, telemetry, tooltip, options = {}) {
  const failed = options.failed ?? telemetry.some((test) => test.failed);
  const palette = failed
  ? { surface: 0x290d19, emissive: 0x431321, ambient: 0xffb6a6, key: 0xff645a, rim: 0xe64a77, grid: 0xb75064, coast: 0xffaa94, glow: 0xff4b68, orbit: 0xf47d82, secondOrbit: 0xb85375, satellite: 0xffdfce, secondSatellite: 0xf299b1, stars: 0xdba2ac }
  : { surface: 0x071a2b, emissive: 0x092739, ambient: 0x98d8ee, key: 0x31eed8, rim: 0x56a9ff, grid: 0x3b9da8, coast: 0x79d9d8, glow: 0x21b9dd, orbit: 0x53ccdc, secondOrbit: 0x3686b6, satellite: 0xe3fcff, secondSatellite: 0x80caf2, stars: 0x9bcee5 };

  const THREE = await import("https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js");
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0, 7.5);

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  root.appendChild(renderer.domElement);

  const globe = new THREE.Group();
  globe.rotation.set(-0.18, -0.45, 0.18);
  scene.add(globe);
  const radius = 1.68;
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 64, 48),
    new THREE.MeshPhongMaterial({ color: palette.surface, emissive: palette.emissive, shininess: 42, transparent: true, opacity: 0.94 })
  );
  globe.add(sphere);
  scene.add(new THREE.AmbientLight(palette.ambient, 0.9));
  const key = new THREE.PointLight(palette.key, 60, 16);
  key.position.set(-3, 3, 5);
  scene.add(key);
  const rim = new THREE.PointLight(palette.rim, 80, 15);
  rim.position.set(3, -2, -3);
  scene.add(rim);

  const position = (latitude, longitude, distance = radius) => {
    const lat = latitude * Math.PI / 180;
    const lon = longitude * Math.PI / 180;
    return new THREE.Vector3(
      distance * Math.cos(lat) * Math.sin(lon),
      distance * Math.sin(lat),
      distance * Math.cos(lat) * Math.cos(lon)
    );
  };
  const trace = (points, color, opacity, group = globe) => {
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false }));
    group.add(line);
    return line;
  };

  for (let latitude = -75; latitude <= 75; latitude += 15) {
    const points = [];
    for (let longitude = -180; longitude <= 180; longitude += 3) points.push(position(latitude, longitude, radius * 1.006));
    trace(points, palette.grid, latitude === 0 ? 0.4 : 0.17);
  }
  for (let longitude = -180; longitude < 180; longitude += 15) {
    const points = [];
    for (let latitude = -90; latitude <= 90; latitude += 3) points.push(position(latitude, longitude, radius * 1.006));
    trace(points, palette.grid, longitude === 0 ? 0.34 : 0.14);
  }

  const coastlines = [
    [[72,-165],[64,-150],[60,-141],[58,-135],[52,-129],[49,-124],[42,-124],[33,-117],[24,-110],[18,-98],[10,-83],[15,-88],[21,-86],[30,-89],[30,-97],[26,-97],[29,-103],[31,-106],[32,-111],[38,-112],[42,-119],[49,-124],[52,-130],[58,-136],[60,-151],[67,-163],[72,-165]],
    [[72,-165],[72,-145],[68,-136],[63,-130],[60,-116],[54,-110],[51,-96],[45,-83],[42,-79],[38,-74],[30,-80],[25,-80],[18,-87]],
    [[12,-72],[8,-77],[2,-80],[-5,-81],[-13,-77],[-18,-70],[-23,-70],[-30,-71],[-34,-72],[-42,-72],[-55,-68],[-52,-72],[-46,-75],[-39,-73],[-33,-71],[-27,-70],[-22,-70],[-18,-69],[-16,-75],[-12,-77],[-4,-81],[1,-78],[6,-77],[11,-73],[12,-72]],
    [[37,-10],[43,-9],[48,-5],[51,2],[54,8],[58,11],[60,5],[64,10],[68,17],[71,26],[70,33],[65,29],[60,30],[56,38],[53,41],[50,30],[46,29],[43,24],[40,20],[38,16],[36,10],[38,0],[37,-10]],
    [[37,-17],[35,-6],[32,10],[31,32],[26,35],[22,38],[12,44],[11,51],[2,42],[-5,40],[-12,41],[-19,36],[-27,33],[-34,26],[-35,18],[-29,16],[-22,14],[-18,12],[-11,14],[-5,11],[4,9],[5,2],[12,-16],[22,-17],[30,-10],[37,-17]],
    [[37,-10],[43,-9],[51,2],[55,10],[55,22],[59,31],[57,43],[55,51],[59,61],[63,67],[66,77],[70,87],[73,100],[72,120],[66,135],[59,142],[53,142],[50,135],[46,142],[44,135],[39,128],[35,129],[32,121],[22,114],[17,109],[10,108],[1,104],[-6,107],[-9,114],[-7,118],[1,117],[7,125],[15,120],[22,110],[20,105],[11,104],[8,98],[13,92],[21,89],[24,83],[17,74],[8,77],[6,81],[8,75],[19,73],[25,69],[24,64],[28,58],[30,49],[37,49],[39,45],[37,36],[40,29],[37,20],[37,-10]],
    [[-11,113],[-17,122],[-23,114],[-32,115],[-35,118],[-38,140],[-33,151],[-27,153],[-21,149],[-16,145],[-11,137],[-12,130],[-11,113]],
    [[60,-45],[65,-53],[70,-52],[77,-43],[83,-40],[82,-20],[76,-18],[70,-23],[65,-38],[60,-45]]
  ];
  for (const outline of coastlines) {
    trace(outline.map(([latitude, longitude]) => position(latitude, longitude, radius * 1.013)), palette.coast, 0.58);
  }

  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 1.13, 64, 32),
    new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: { glowColor: { value: new THREE.Color(palette.glow) } },
      vertexShader: "varying vec3 vNormal; varying vec3 vPosition; void main(){vNormal=normalize(normalMatrix*normal);vPosition=normalize(-(modelViewMatrix*vec4(position,1.0)).xyz);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
      fragmentShader: "uniform vec3 glowColor; varying vec3 vNormal; varying vec3 vPosition; void main(){float intensity=pow(0.68-dot(vNormal,vPosition),3.0);gl_FragColor=vec4(glowColor,clamp(intensity*0.62,0.0,0.43));}"
    })
  );
  globe.add(atmosphere);

  const orbit = new THREE.Group();
  orbit.rotation.set(0.42, -0.3, -0.35);
  globe.add(orbit);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 1.47, 0.004, 4, 180),
    new THREE.MeshBasicMaterial({ color: palette.orbit, transparent: true, opacity: 0.32 })
  );
  orbit.add(ring);
  const satellite = new THREE.Mesh(new THREE.OctahedronGeometry(0.048), new THREE.MeshBasicMaterial({ color: palette.satellite }));
  satellite.position.set(radius * 1.47, 0, 0);
  orbit.add(satellite);
  const secondOrbit = new THREE.Group();
  secondOrbit.rotation.set(1.3, 0.25, 0.32);
  globe.add(secondOrbit);
  secondOrbit.add(new THREE.Mesh(
    new THREE.TorusGeometry(radius * 1.65, 0.003, 4, 200),
    new THREE.MeshBasicMaterial({ color: palette.secondOrbit, transparent: true, opacity: 0.28 })
  ));
  const secondSatellite = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.035),
    new THREE.MeshBasicMaterial({ color: palette.secondSatellite })
  );
  secondSatellite.position.set(Math.cos(2) * radius * 1.65, Math.sin(2) * radius * 1.65, 0);
  secondOrbit.add(secondSatellite);

  const markerGeometry = new THREE.SphereGeometry(0.052, 12, 8);
  const haloGeometry = new THREE.RingGeometry(0.082, 0.092, 32);
  const markers = [];
  telemetry.forEach((test, index) => {
    const latitude = 52 - (index * 137.508) % 104;
    const longitude = ((index * 222.492 + 70) % 360) - 180;
    const location = position(latitude, longitude, radius * 1.035);
    const color = test.failed ? 0xff607f : 0x72f7d8;
    const marker = new THREE.Mesh(markerGeometry, new THREE.MeshBasicMaterial({ color }));
    marker.position.copy(location);
    marker.userData = test;
    globe.add(marker);
    markers.push(marker);
    const halo = new THREE.Mesh(haloGeometry, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }));
    halo.position.copy(location.clone().multiplyScalar(1.014));
    halo.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), location.clone().normalize());
    globe.add(halo);
    const start = position(23, -32, radius * 1.025);
    const middle = start.clone().add(location).multiplyScalar(0.5).normalize().multiplyScalar(radius * 1.26);
    const route = new THREE.QuadraticBezierCurve3(start, middle, location);
    trace(route.getPoints(40), color, test.failed ? 0.72 : 0.24);
  });

  const stars = new Float32Array(900 * 3);
  for (let index = 0; index < stars.length; index += 3) {
    const distance = 12 + Math.random() * 18;
    const angle = Math.random() * Math.PI * 2;
    const height = Math.random() * 2 - 1;
    stars[index] = Math.sqrt(1 - height * height) * Math.cos(angle) * distance;
    stars[index + 1] = height * distance;
    stars[index + 2] = Math.sqrt(1 - height * height) * Math.sin(angle) * distance;
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute("position", new THREE.BufferAttribute(stars, 3));
  scene.add(new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: palette.stars, size: 0.026, transparent: true, opacity: 0.68, sizeAttenuation: true })));

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let dragging = false;
  let dragDistance = 0;
  let lastX = 0;
  let lastY = 0;
  let hovered = null;
  let cameraX = 0;
  let cameraY = 0;
  root.addEventListener("pointerdown", (event) => {
    dragging = true;
    dragDistance = 0;
    lastX = event.clientX;
    lastY = event.clientY;
    root.setPointerCapture(event.pointerId);
  });
  root.addEventListener("pointerup", () => { dragging = false; });
  root.addEventListener("pointercancel", () => { dragging = false; });
  root.addEventListener("pointerleave", () => {
    if (!dragging) tooltip.hidden = true;
    cameraX = 0;
    cameraY = 0;
  });
  root.addEventListener("pointermove", (event) => {
    const bounds = root.getBoundingClientRect();
    cameraX = (event.clientX - bounds.left) / bounds.width * 2 - 1;
    cameraY = (event.clientY - bounds.top) / bounds.height * 2 - 1;
    if (dragging) {
      dragDistance += Math.abs(event.clientX - lastX) + Math.abs(event.clientY - lastY);
      globe.rotation.y += (event.clientX - lastX) * 0.006;
      globe.rotation.x = THREE.MathUtils.clamp(globe.rotation.x + (event.clientY - lastY) * 0.006, -1.1, 1.1);
      lastX = event.clientX;
      lastY = event.clientY;
      tooltip.hidden = true;
      return;
    }
    pointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1, -(event.clientY - bounds.top) / bounds.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects([sphere, ...markers])[0];
    hovered = hit && hit.object !== sphere ? hit.object : null;
    if (hovered) {
      tooltip.textContent = hovered.userData.description || `${hovered.userData.failed ? "✕" : "✓"} ${hovered.userData.name} · ${hovered.userData.kind} · ${hovered.userData.actual} / ${hovered.userData.expected}`;
      tooltip.style.left = `${event.clientX - bounds.left + 12}px`;
      tooltip.style.top = `${event.clientY - bounds.top - 34}px`;
      tooltip.hidden = false;
    } else {
      tooltip.hidden = true;
    }
    root.style.cursor = hovered ? "pointer" : "grab";
  });
  root.addEventListener("click", () => {
    if (!hovered || dragDistance > 5) return;
    if (options.onSelect) {
      options.onSelect(hovered.userData);
      return;
    }
    const row = document.getElementById(`test-${hovered.userData.index}`);
    if (row) {
      row.open = true;
      row.scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth", block: "center" });
    }
  });

  const resize = () => {
    const width = root.clientWidth;
    const height = root.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  };
  const observer = new ResizeObserver(resize);
  observer.observe(root);
  resize();
  root.classList.add("ready");
  const clock = new THREE.Clock();
  const animate = () => {
    requestAnimationFrame(animate);
    const elapsed = clock.getElapsedTime();
    if (document.hidden) return;
    if (!reducedMotion.matches) {
      if (!dragging) globe.rotation.y += 0.0018;
      camera.position.x += (cameraX * 0.3 - camera.position.x) * 0.035;
      camera.position.y += (-cameraY * 0.2 - camera.position.y) * 0.035;
      camera.lookAt(0, 0, 0);
      satellite.position.set(Math.cos(elapsed * 0.35) * radius * 1.47, Math.sin(elapsed * 0.35) * radius * 1.47, 0);
      secondSatellite.position.set(Math.cos(elapsed * -0.23 + 2) * radius * 1.65, Math.sin(elapsed * -0.23 + 2) * radius * 1.65, 0);
    }
    markers.forEach((marker, index) => {
      marker.scale.setScalar(1 + (reducedMotion.matches ? 0 : Math.sin(elapsed * 2.5 + index * 1.7) * 0.22));
    });
    renderer.render(scene, camera);
  };
  animate();
}

const root = document.getElementById("globe");
const data = document.getElementById("telemetry-data");
if (root && data) {
  mountGlobe(root, JSON.parse(data.textContent), document.getElementById("globe-tooltip"))
    .catch(() => { root.classList.add("offline"); });
}
