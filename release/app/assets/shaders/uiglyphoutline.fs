#version 400

uniform sampler2DRect glyphs;

in vec3 vPosition;
in vec2 vTexCoord;
in vec4 vColor;

out vec4 fragColor;

void main(void) {
  // density is 0.0 if glyph is full, otherwise combines all neighboring texels
  float texel = texture(glyphs, vTexCoord).r;
  float density = texel > 0.0 && texel < 1.0 ? 4.0 : texture(glyphs, vTexCoord).r
    + texture(glyphs, vTexCoord + vec2(1.0, 0.0)).r
    + texture(glyphs, vTexCoord + vec2(-1.0, 0.0)).r
    + texture(glyphs, vTexCoord + vec2(0.0, 1.0)).r
    + texture(glyphs, vTexCoord + vec2(0.0, -1.0)).r;

  density = density <= 2.0 ? 0.0 : density > 4.5 ? 0.0 : 1.0;

  fragColor = vec4(vColor.rgb, min(density * 0.3, 1.0) * vColor.a);
}
