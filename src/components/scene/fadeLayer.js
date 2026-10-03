import * as THREE from 'three';
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';

// A pass drawn into its own buffer, then onto the screen inside a viewport at an opacity, tone
// mapped like the rest of the scene. For fading the store and rider in and out.
export function createFadeLayer(renderer) {
  const target = new THREE.WebGLRenderTarget(1, 1, { samples: 4, type: THREE.HalfFloatType });
  const quad = new FullScreenQuad(new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: target.texture }, opacity: { value: 1 } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `uniform sampler2D tDiffuse;
      uniform float opacity;
      varying vec2 vUv;
      void main() {
        vec4 texel = texture2D(tDiffuse, vUv);
        gl_FragColor = texel;
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        gl_FragColor = vec4(gl_FragColor.rgb, texel.a) * opacity;
      }`,
    depthTest: false,
    depthWrite: false,
    transparent: true,
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.OneFactor,
    blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
  }));
  const clearColor = new THREE.Color();
  return {
    render: (scene, camera, view, opacity) => {
      const ratio = renderer.getPixelRatio();
      target.setSize(Math.max(1, Math.round(view.width * ratio)), Math.max(1, Math.round(view.height * ratio)));
      renderer.getClearColor(clearColor);
      const clearAlpha = renderer.getClearAlpha();
      renderer.setRenderTarget(target);
      renderer.setClearColor(0x000000, 0);
      renderer.clear();
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      renderer.setClearColor(clearColor, clearAlpha);
      renderer.setViewport(view.x, view.y, view.width, view.height);
      quad.material.uniforms.opacity.value = opacity;
      quad.render(renderer);
    },
    dispose: () => {
      target.dispose();
      quad.material.dispose();
      quad.dispose();
    },
  };
}
