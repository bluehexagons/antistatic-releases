#version 400

uniform mat4 uiTransform;

layout(location = 0) in vec3 pos;
layout(location = 1) in vec4 color;

out vec3 vPosition;

out vec4 vColor;

const vec3 gamma = vec3(2.2);
vec3 toneMapLuminance(vec3 color) {
  // luminance/intensity
  float l = 1.0/61.0 * (color.r*20.0 + color.g*40.0 + color.b);
  vec3 chrominance = color.rgb/l;
  float l2 = log2(l);
  // bilateral filter? will be useful when moving to full HDR pipeline
  // float b = bf(l2);
  // float d = l2 - b;
  float b = l2;
  float d = l2 - b;

  float offset = 0.1;
  float scale = 0.05;
  float bp = (b-offset)*scale;
  float o = exp(bp+d);

  return pow((o * color.rgb), gamma);
}

void main(void) {
  vPosition = pos;
  vec4 p = uiTransform * vec4(pos, 1.0);
  gl_Position = vec4(p.x + 1.0, p.y - 1.0, p.z, p.w);
  vColor = vec4(toneMapLuminance(color.rgb), color.a);
}
