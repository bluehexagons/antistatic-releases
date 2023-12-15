#version 400
out vec4 fragColor;

uniform mat4 lightTransform;
uniform mat4 transform;
uniform mat4 view;
uniform mat4 projection;

uniform sampler2D hdr;
uniform sampler2D depth;
uniform sampler2D specRough;
uniform sampler2D albedo;
uniform sampler2D normals;

in vec2 vTexCoord;

uniform vec2 viewportSize;

uniform float noiseTile[16];

const vec3 gamma = vec3(1.4);
const float exposure = 1.0;

// from https://learnopengl.com/code_viewer_gh.php?code=src/5.advanced_lighting/6.hdr/6.hdr.fs
const int useExposure = 1;
vec3 toneMapExposure(vec3 color) {
  // reinhard
  // vec3 result = color / (color + vec3(1.0));
  // exposure
  vec3 result = vec3(1.0) - exp(-color * exposure);
  // also gamma correct while we're at it
  result = pow(result, gamma);
  return result;
}

// based on http://cs.brown.edu/courses/cs129/results/proj5/njooma/
const int useLuminance = 2;
vec3 toneMapLuminance(vec3 color) {
  // luminance/intensity
  float l = 1.0/60.0 * (color.r*0.078125 + color.g*0.15625 + color.b);
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

const int useGamma = 3;
vec3 toneMapGamma(vec3 color) {
  return clamp(pow(color.rgb, gamma), 0.1, 0.9);
}

const int toneMap = useLuminance;

const vec3 hdrScale = vec3(4.0);

void main(void) {
  vec3 c = texture2D(hdr, vTexCoord).xyz * hdrScale;

  fragColor = vec4(
    toneMap == useLuminance
      ? toneMapLuminance(c) :
    toneMap == useExposure
      ? toneMapExposure(c) :
    toneMap == useGamma
      ? toneMapGamma(c)
    : c,
    1.0
  );

  // debug: pass color directly
  // fragColor = vec4(texture2D(hdr, vTexCoord).xyz, 1.0);
  // fragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
  // fragColor = vec4(texture2D(hdr, vTexCoord).xyz * 2.0, 1.0);
  // fragColor = vec4(clamp(texture2D(hdr, vTexCoord).xyz, 0.1, 0.11), 1.0);
  // fragColor = vec4(1.0);
}
