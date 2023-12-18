float sdBox( vec3 p, vec3 b )
{
  vec3 q = abs(p) - b;
  return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);
}

float sdTriPrism( vec3 p, vec2 h )
{
  vec3 q = abs(p);
  return max(q.z-h.y,max(q.x*0.866025+p.y*0.5,-p.y)-h.x*0.5);
}


#define MAX_ITER_JER 30


#export vec4 IFS(vec3 P, float min_detail){
    //float S = 2.;
    //P *= .5;

    float cube = sdTriPrism(P, vec2(1., .1));

    return vec4(cube, vec3(1, 1, .5));
    // return vec4(cube, color);
}