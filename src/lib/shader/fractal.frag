
#ifdef GL_ES
precision highp float;
precision mediump int;
#endif

uniform float time;
uniform mat4 cam_direction;
uniform vec3 light_direction;
uniform float screen_ratio;

parameter static int reflection_bounces = 2 [1, 10];

parameter dynamic float cut_position = -2 [-1.5, 1.5];
parameter static float roundness = 0.0 [0.0, 0.1];
parameter static float LOD = 150. [0, 2000.];
// uniform vec3 cut_direction;

// parameter static int global_illumination_iterations = 1 [0, 1];
// parameter static int global_illumination_samples = 6 [3, 10];

// in vec4 vertTexCoord;
in vec2 vUv;
out vec4 fragColor;

#define PI 3.14159265359
#define MAX_ITER_MARCH 200
#define MIN_DETAIL_MAP 0.0001
#define MIN_DIST .00001
#define MAX_DIST 500.
#define EPS .00001

/*
    static.frag
    by Spatial
    05 July 2013
*/

/////////////////////////
// A single iteration of Bob Jenkins' One-At-A-Time hashing algorithm.
uint hash( uint x ) {
    x += ( x << 10u );
    x ^= ( x >>  6u );
    x += ( x <<  3u );
    x ^= ( x >> 11u );
    x += ( x << 15u );
    return x;
}
// Compound versions of the hashing algorithm I whipped together.
uint hash( uvec2 v ) { return hash( v.x ^ hash(v.y)                         ); }
uint hash( uvec3 v ) { return hash( v.x ^ hash(v.y) ^ hash(v.z)             ); }
uint hash( uvec4 v ) { return hash( v.x ^ hash(v.y) ^ hash(v.z) ^ hash(v.w) ); }
// Construct a float with half-open range [0:1] using low 23 bits.
// All zeroes yields 0.0, all ones yields the next smallest representable value below 1.0.
float floatConstruct( uint m ) {
    const uint ieeeMantissa = 0x007FFFFFu; // binary32 mantissa bitmask
    const uint ieeeOne      = 0x3F800000u; // 1.0 in IEEE binary32

    m &= ieeeMantissa;                     // Keep only mantissa bits (fractional part)
    m |= ieeeOne;                          // Add fractional part to 1.0

    float  f = uintBitsToFloat( m );       // Range [1:2]
    return f - 1.0;                        // Range [0:1]
}
// Pseudo-random value in half-open range [0:1].
float random( float x ) { return floatConstruct(hash(floatBitsToUint(x))); }
float random( vec2  v ) { return floatConstruct(hash(floatBitsToUint(v))); }
float random( vec3  v ) { return floatConstruct(hash(floatBitsToUint(v))); }
float random( vec4  v ) { return floatConstruct(hash(floatBitsToUint(v))); }
//////////////////////

//this is going to paste in the fractal distance function
#import "__fractal.glsl" as fractalSDF

struct PData{
    float D;
    vec3 COL;
};
PData map(vec3 P, float min_detail){
    vec4 fractal = fractalSDF(P, min_detail) - roundness;

    // return PData(fractal.x, fractal.yzw);

    vec3 cut_direction = vec3(0, -1, 0);
    float cut_plane = dot(cut_direction, P)-cut_position;

    return PData(
        max(fractal.x, -cut_plane), 
        cut_plane > EPS ? fractal.yzw : .5*vec3(1., .2, .2)+.5*fractal.yzw);
}

struct MData{
    float D; // distance travelled
    float min_detail; // mininum detail size
    float mn; // min distance
    vec3 COL; // color
};
MData march(vec3 O, vec3 D){
    float t = 0.;
    float mn = MAX_DIST;
    PData d;

    float min_detail = MIN_DETAIL_MAP;
    float lod_count = 1.;

    // #pragma chunk_loop_start 50
    for(int i=0; i<MAX_ITER_MARCH; i++){
        d = map(O + t*D, min_detail);
        t += d.D;
        // ite = LOD*log(C2/t);
        //iter = min(MAX_ITER_MAP, int(ite));
        mn = min(mn, d.D);

        lod_count += 1.;
        float div = 1./(lod_count+1.);
        min_detail = div*lod_count* min_detail + div* t/LOD;
        
        if(t > MAX_DIST) break;
        if(d.D < MIN_DIST) break; 
    }
    // #pragma chunk_loop_end

    return MData(t, min_detail, mn, d.COL);
}

float softshadow(in vec3 ro, in vec3 rd, float mint, float maxt, float k, float min_detail){
    float res = 1.0;
    #pragma unroll_loop_start
    for( float t=mint; t<maxt; ){
        float h = map(ro + rd*t, min_detail).D;
        if( h<MIN_DIST ) return 0.0;
        res = min( res, k*h/t );
        t += h;
    }
    #pragma unroll_loop_end
    return res;
}
float softshadow2( in vec3 ro, in vec3 rd, float mint, float maxt, float k, float min_detail){
    float res = 1.0;
    float ph = 1e20;
    #pragma unroll_loop_start
    for( float t=mint; t<maxt; ){
        float h = map(ro + rd*t, min_detail).D;
        if( h<MIN_DIST ) return 0.0;
        float y = h*h/(2.0*ph);
        float d = sqrt(h*h-y*y);
        res = min( res, k*d/max(0.0,t-y) );
        ph = h;
        t += h;
    }
    #pragma unroll_loop_end
    return res;
}

vec3 normal(vec3 p, float min_detail){
    const vec2 X = vec2(EPS, 0); 
    // maybe change this
    return (vec3(
        map(p + X.xyy, min_detail).D, 
        map(p + X.yxy, min_detail).D, 
        map(p + X.yyx, min_detail).D
    )-vec3(map(p, min_detail).D))/EPS;
}

void main() {
    vec3 color = vec3(0);

    vec2 uv = vUv*2.-1.;
    uv.y *= screen_ratio;
    vec3 oro = cameraPosition;
    vec3 ord = (cam_direction * vec4(normalize(vec3(uv.xy, -3)), 1)).xyz;
    vec3 ro = oro;
    vec3 rd = ord;

    //const vec3 SUN = normalize(vec3(1, 3, 1.5));
    vec3 SUN = normalize(light_direction);
    const vec3 SUN_COL = vec3(1, .8, .8);

    vec3 color_accumulator = vec3(1);
    #pragma unroll_loop_start
    for(int i=0; i<reflection_bounces; i++){
        MData mp = march(ro, rd);
        vec3 P = ro + rd * mp.D;
        //vec3 N = mp.N; 
        vec3 N = normal(P, mp.min_detail);
        float sh = softshadow2(P + (MIN_DIST*3.)*N, SUN, 0., 50., 6., mp.min_detail);
        
        float diffuse = max(0., dot(N, SUN));
        float specular = pow(clamp(dot(reflect(-SUN, N), -rd), 0., 1.), 8.);

        if(mp.D < MAX_DIST){
            // const vec3 COL = vec3(1, .5, .5);
            //const vec3 COL = vec3(.5, .5, 1);
            //const vec3 COL = vec3(.5, 1., .5);
            color.rgb += color_accumulator*
                (diffuse+specular)*mp.COL*SUN_COL*sh;
            color_accumulator *= mp.COL*
                mix(.2, .65, 1.-max(0., dot(-rd, N)));
            ro = P+N*(EPS*3.);
            rd = reflect(rd, N);
        }else{
            color.rgb += color_accumulator*
                vec3(.3, .3, .5);
            color.rgb += color_accumulator*
                exp(1.-mp.mn*3.)*vec3(1, .5+.5*sin(time), 1)*.4;
            break;
        }
    }
    #pragma unroll_loop_end

    /*
    if(global_illumination_iterations > 0){
        MData omp = march(oro, ord);
        vec3 oP = oro + ord * omp.D;
        oP += normal(oP)*EPS;
        vec3 gi_color = vec3(0);
        if(omp.D < MAX_DIST){
            #pragma unroll_loop_start
            for(int smpl=0; smpl<global_illumination_samples; smpl++){
                rd = normalize(normal(oP) + 
                    0.7*vec3(
                        random(vec4(oP, 1 + smpl*3)),
                        random(vec4(oP, 2 + smpl*3)),
                        random(vec4(oP, 3 + smpl*3))
                        ));
                MData mp = march(oP, rd);
                vec3 P = oP + rd * mp.D;
                
                vec3 N = normal(P);
                float sh = softshadow2(P + (MIN_DIST*3.)*N, SUN, 0., 50., 6.);
                
                float diffuse = max(0., dot(N, SUN));
                float specular = pow(clamp(dot(reflect(-SUN, N), -rd), 0., 1.), 8.);

                if(mp.D < MAX_DIST){
                    // gi_color += vec3(1, 0, 0);
                    gi_color += (sh*0.9+0.1)*mp.COL;
                    // gi_color += omp.COL*(diffuse+specular)*mp.COL*SUN_COL*sh;
                }else{
                    // gi_color += vec3(0, 0, 1);
                    gi_color += omp.COL*vec3(.3, .3, .5);
                    gi_color += omp.COL*exp(1.-mp.mn*3.)*vec3(1, .5+.5*sin(time), 1)*.4;
                    break;
                }
            }
            #pragma unroll_loop_end
            gi_color *= 1./float(global_illumination_samples);
            // color.rgb = color.rgb + gi_color * 0.5;
            color.rgb = 0.6*omp.COL + 0.4*gi_color;
        }
    }
    */

    fragColor = vec4(color, 1);
}