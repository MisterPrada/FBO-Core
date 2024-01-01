

//float texture containing the positions of each particle
uniform sampler2D positions;
uniform float uPointSize;
uniform float uPixelRatio;

varying float size;
void main() {

    //the mesh is a nomrliazed square so the uvs = the xy positions of the vertices
    vec3 pos = texture2D( positions, position.xy ).xyz;

    //pos now contains the position of a point in space taht can be transformed
    gl_Position = projectionMatrix * modelViewMatrix * vec4( pos, 1.0 );

    vec4 modelPosition = modelMatrix * vec4(position, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectionPosition = projectionMatrix * viewPosition;

    gl_PointSize = uPixelRatio * uPointSize;
    gl_PointSize *= (1.0 / - viewPosition.z);

    size = gl_PointSize;

    //size
    //gl_PointSize = size = max( 1., ( step( 1. - ( 1. / 512. ), position.x ) ) * pointSize );


}
