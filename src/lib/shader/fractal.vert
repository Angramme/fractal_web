// uniform mat4 projectionMatrix;
// uniform mat4 modelViewMatrix;
// uniform mat4 modelViewMatrix;
// uniform mat4 viewMatrix;
// uniform mat3 normalMatrix;

// uniform vec3 lightNormal;
// uniform mat4 texMatrix;
uniform float screen_ratio;

// in vec3 position;
// in vec4 color;
// in vec3 normal;
// in vec2 uv;

// out vec4 vertColor;
// out vec3 vertNormal;
// out vec3 vertLightDir;
// out vec4 vertTexCoord;
out vec2 vUv;


void main() {
  // gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
  gl_Position = vec4( position, 1.0 );
  // vertColor = color;
  // vertNormal = normalize(normalMatrix * normal);
  // vertLightDir = -lightNormal;

  vUv = uv;
  // vertTexCoord = texMatrix * vec4(uv, 1.0, 1.0);
  // vertTexCoord.x *= screen_ratio;
  // vertTexCoord = texMatrix* vec4(texCoord*vec2(screen_size.x/screen_size.y, 1.), 1.0, 1.0);
  // vertTexCoord = texCoord;
}