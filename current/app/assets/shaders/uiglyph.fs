#version 400

uniform sampler2DRect glyphs;

in vec3 vPosition;
in vec2 vTexCoord;
in vec4 vColor;

out vec4 fragColor;

void main(void) {
  fragColor = vec4(vColor.rgb, texture(glyphs, vec2(vTexCoord.xy)).r * vColor.a);
}
