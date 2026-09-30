// The lab's card: how the kitsune scene was built, in place of the role cards.
const NOTES = [
  {
    title: 'How it was built',
    text: 'The figure is a Meshy image-to-3D scan, measured at load to find his ground, torso, facing and tailbone, so the tails, camera and collisions fit whatever model is loaded. Each of the six tails is one sculpted mesh bent along a 22-point Verlet chain stepped at 120 Hz, with home springs, bend limits, capsule and low-poly shell collisions between tails, and gusts from the mouse. The hologram is a Fresnel rim shader with premultiplied blending, which lets the black tails read as dark glass, fed through a bloom pass.',
  },
  {
    title: 'Learnings',
    text: 'Default glTF compression smeared the jacket lettering, because Meshy tiles its fragmented texture 16 times and 12-bit texture coordinates land on the wrong texels, so the scan is compressed at 16 bits with exact welds. Most of the early tail jitter came from Verlet contact pushes acting as velocity kicks, and soft contacts that move the previous position along with the point removed it. A single NaN pixel was enough for the bloom to flash the whole screen, so the shader and the physics both guard their inputs.',
  },
  {
    title: 'Performance',
    text: 'The camera only turns within a fixed range, so a script samples all 189 poses it can reach and deletes the geometry none of them see, leaving 17% of the rock and removing the far side of the figure. The 34 cherry blossom props are instanced, taking them from about 220 draw calls per frame to 28, and dropping them onto the rock through a triangle grid cut their placement from 1.2 s to 20 ms. Shadows are rendered once since only the tails move, and the scene is preloaded with its shaders compiled while the homepage is idle.',
  },
];

export default function KitsuneNotes() {
  return (
    <div className="kitsune-role-slot">
      <article className="kitsune-role kitsune-notes">
        {NOTES.map(({ title, text }) => (
          <section key={title}>
            <h3>{title}</h3>
            <p>{text}</p>
          </section>
        ))}
      </article>
    </div>
  );
}
