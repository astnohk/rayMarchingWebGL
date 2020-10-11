"use strict";

var cameraPosition = [ 0.0, 0.0, -1.0 ];
var wallOffset = 0.8;
var spherePositions = [
    [ -0.8, 0.9, 2.9 ],
    [ 0.3, -0.2, 2.0 ],
    [ -0.6, -0.7, 1.2 ],
    [ 0.0, 0.7, 0.4 ],
    [ 0.9, -0.9, 0.14 ],
    [ -0.6, 0.1, -0.5 ],
    ];
var sphereRadiuses = [
    0.3,
    0.2,
    0.1,
    0.05,
    0.025,
    ];

var max_iter = 4.0;
var max_bound = 16;


//// Render view
const vsSource =
	`#version 300 es

	precision highp float;

	in vec4 vertexPosition;
	in vec3 vertexTextureCoord;

	out vec3 vTextureCoord;

	void main(void) {
		gl_Position = vertexPosition;
		vTextureCoord = vertexTextureCoord;
	}
`;
// Fragment shader program
const fsSource =
	`#version 300 es
	#define M_PI 3.1415926535897932384626433832795
	#define NUM_SPHERE 16
	#define NUM_WALL 5
	#define MAX_ITER_MARCHING 128

	precision highp float;

	uniform float seed;
	uniform sampler2D texture;
	uniform mat3 textureMatrix;
	uniform vec3 cameraPosition;
	uniform int numberOfSphere;
	uniform vec3 spherePosition[NUM_SPHERE];
	uniform float sphereRadius[NUM_SPHERE];
	uniform float wallOffset; // the distance from center
	uniform float max_iter;
	uniform int max_bound;

	float exposure = 1.08;
	float no_fog = 0.9; // probability of rays not hit particle in the air

	in vec3 vTextureCoord;

	out vec4 fragmentColor;

	vec3 wallPosition[NUM_WALL];
	vec3 wallDirection[NUM_WALL];
	vec3 wallColor[NUM_WALL];
	vec3 wallReflection[NUM_WALL];

	float random(vec2 v) {
		return fract(sin(dot(v, vec2(12.9898, 78.233))) * 43758.5453);
	}

	struct TraceData {
		vec3 pos;
		vec3 dir;
		vec3 col;
		vec3 reflection;
	};

	float d_intersection(float shape0, float shape1)
	{
		return max(shape0, shape1);
	}

	float d_union(float shape0, float shape1)
	{
		return min(shape0, shape1);
	}

	// Calculate shape0 - shape1
	// args:
	//     shape0: distance of the base shape
	//     shape1: distance of the subtract shape
	float d_diff(float shape0, float shape1)
	{
		return max(shape0, -shape1);
	}

	// args:
	//     pos: position of center of the wall
	//     dir: direction of surface norm of the wall (should be normalized)
	//     ray: current position of the ray
	float d_plane(vec3 pos, vec3 dir, vec3 pos_ray)
	{
		return dot(pos_ray - pos, dir);
	}

	// args:
	//     pos: position of center of the sphere
	//     ray: current position of the ray
	float d_sphere(vec3 pos, float r, vec3 pos_ray)
	{
		return length(pos - pos_ray) - r;
	}

	// args:
	//     sp: position of start edge of the cylinder
	//     ep: position of end edge of the cylinder
	//     ray: current position of the ray
	float d_cylinder(vec3 sp, vec3 ep, float r, vec3 pos_ray)
	{
		vec3 mid = (sp + ep) * 0.5;
		float lh = length(ep - mid);
		vec3 a = normalize(ep - sp);
		float v = dot(a, pos_ray - mid);
		vec3 n = normalize(pos_ray - mid - v * a);
		float d = mix(
			length(pos_ray - mid - v * a) - r,
			//min(length(pos_ray - sp), length(pos_ray - ep)),
			mix(max(dot(sp - pos_ray, a), dot(pos_ray - ep, a)),
			    min(length(sp + n * r - pos_ray), length(pos_ray - ep - n * r)),
			    step(r, dot(pos_ray - sp, n))),
			step(lh, abs(v)));

		return d;
	}

	// args:
	//     origin: start point of ray
	//     ray: direction of ray (should be normalized)
	TraceData traceRay(TraceData ray, const float iter) {
		const float d_ep = 1.0E-6;

		for (int i = 0; i < MAX_ITER_MARCHING; i++) {
			float d; // temporary distance between current ray position and objects

			////
			// sphere hit
			////
			int hitSphere = -1;
			float d_min = 1000.0;
			/*
			for (int n = 0; n < numberOfSphere; n++) {
				d = d_sphere(spherePosition[n], sphereRadius[n], ray.pos);
				if (d < d_ep) {
					hitSphere = n;
				}
				d_min = min(d, d_min);
			}
			*/
			for (int n = 0; n < numberOfSphere - 1; n++) {
				d = d_cylinder(spherePosition[n], spherePosition[n + 1], sphereRadius[n], ray.pos);
				if (d < d_ep) {
					hitSphere = n;
				}
				d_min = min(d, d_min);
			}

			////
			// wall hit
			////
			int hitWall = -1;
			for (int n = 0; n < NUM_WALL; n++) {
				d = d_plane(wallPosition[n], wallDirection[n], ray.pos);
				d_min = min(d, d_min);
				if (d < d_ep) {
					hitWall = n;
				}
			}

			// Forward ray
			ray.pos += ray.dir * d_min;

			// Add fog
			//ray.col += vec3(0.01, 0.01, 0.02) * step(pow(no_fog, 1.0 + d_min * 10.0), abs(random(vec2(seed, ray.pos.z))));
			ray.col += vec3(0.10, 0.10, 0.17) * ray.reflection * d_min * abs(random(vec2(seed, ray.pos.x + ray.pos.y + ray.pos.z)));

			// Reflect
			if (hitSphere >= 0) {
				// Get normal vector
				vec3 norm;
				/*
				norm.x = d_sphere(spherePosition[hitSphere], sphereRadius[hitSphere], ray.pos + vec3(1.0E-6, 0.0, 0.0)) - d_sphere(spherePosition[hitSphere], sphereRadius[hitSphere], ray.pos - vec3(1.0E-6, 0.0, 0.0));
				norm.y = d_sphere(spherePosition[hitSphere], sphereRadius[hitSphere], ray.pos + vec3(0.0, 1.0E-6, 0.0)) - d_sphere(spherePosition[hitSphere], sphereRadius[hitSphere], ray.pos - vec3(0.0, 1.0E-6, 0.0));
				norm.z = d_sphere(spherePosition[hitSphere], sphereRadius[hitSphere], ray.pos + vec3(0.0, 0.0, 1.0E-6)) - d_sphere(spherePosition[hitSphere], sphereRadius[hitSphere], ray.pos - vec3(0.0, 0.0, 1.0E-6));
				*/
				norm.x = d_cylinder(spherePosition[hitSphere], spherePosition[hitSphere + 1], sphereRadius[hitSphere], ray.pos + vec3(1.0E-6, 0.0, 0.0)) -
					d_cylinder(spherePosition[hitSphere], spherePosition[hitSphere + 1], sphereRadius[hitSphere], ray.pos - vec3(1.0E-6, 0.0, 0.0));
				norm.y = d_cylinder(spherePosition[hitSphere], spherePosition[hitSphere + 1], sphereRadius[hitSphere], ray.pos + vec3(0.0, 1.0E-6, 0.0)) -
					d_cylinder(spherePosition[hitSphere], spherePosition[hitSphere + 1], sphereRadius[hitSphere], ray.pos - vec3(0.0, 1.0E-6, 0.0));
				norm.z = d_cylinder(spherePosition[hitSphere], spherePosition[hitSphere + 1], sphereRadius[hitSphere], ray.pos + vec3(0.0, 0.0, 1.0E-6)) -
					d_cylinder(spherePosition[hitSphere], spherePosition[hitSphere + 1], sphereRadius[hitSphere], ray.pos - vec3(0.0, 0.0, 1.0E-6));
				norm = normalize(norm);

				// Reflect
				ray.dir = reflect(ray.dir, norm);
				ray.pos += ray.dir * d_ep * 10.0;

				// Color
				// ray.col += ray.reflection * vec3(0.0, 0.0, 0.0);
				//const vec3 reflection = vec3(1.0, 0.9, 0.9);
				const vec3 reflection = vec3(1.0, 1.0, 1.0);
				const float f0 = 0.8;
				ray.reflection = ray.reflection * reflection * vec3(mix(
				    f0 + (1.0 - f0) * pow(1.0 - dot(ray.dir, norm), 5.0),
				    f0 * dot(ray.dir, norm),
				    step(1.0, iter)));
			} else if (hitWall >= 0) {
				// Get normal vector
				vec3 norm;
				norm.x = d_plane(wallPosition[hitWall], wallDirection[hitWall], ray.pos + vec3(1.0E-6, 0.0, 0.0)) - d_plane(wallPosition[hitWall], wallDirection[hitWall], ray.pos - vec3(1.0E-6, 0.0, 0.0));
				norm.y = d_plane(wallPosition[hitWall], wallDirection[hitWall], ray.pos + vec3(0.0, 1.0E-6, 0.0)) - d_plane(wallPosition[hitWall], wallDirection[hitWall], ray.pos - vec3(0.0, 1.0E-6, 0.0));
				norm.z = d_plane(wallPosition[hitWall], wallDirection[hitWall], ray.pos + vec3(0.0, 0.0, 1.0E-6)) - d_plane(wallPosition[hitWall], wallDirection[hitWall], ray.pos - vec3(0.0, 0.0, 1.0E-6));
				norm = normalize(norm);

				// Reflect
				ray.dir = reflect(ray.dir, norm);
				ray.pos += ray.dir * d_ep * 2.0;

				// Color
				ray.col += ray.reflection * wallColor[hitWall];
				const vec3 reflection = vec3(0.1, 0.1, 0.1);
				const float f0 = 0.8;
				ray.reflection = ray.reflection * wallReflection[hitWall] * vec3(mix(
				    f0 + (1.0 - f0) * pow(1.0 - dot(ray.dir, norm), 5.0),
				    f0 * dot(ray.dir, norm),
				    step(1.0, iter)));
			}
		}
		ray.col = clamp(ray.col, 0.0, 2.0);
		return ray;
	}

	void main(void) {
		wallPosition[0] = vec3(-1.0, 0.0, 0.0);
		wallPosition[1] = vec3(1.0, 0.0, 0.0);
		wallPosition[2] = vec3(0.0, -1.0, 0.0);
		wallPosition[3] = vec3(0.0, 1.0, 0.0);
		wallPosition[4] = vec3(0.0, 0.0, -2.0);
		wallDirection[0] = vec3(1.0, 0.0, 0.0);
		wallDirection[1] = vec3(-1.0, 0.0, 0.0);
		wallDirection[2] = vec3(0.0, 1.0, 0.0);
		wallDirection[3] = vec3(0.0, -1.0, 0.0);
		wallDirection[4] = vec3(0.0, 0.0, 1.0);
		wallColor[0] = vec3(0.5, 0.5, 0.8);
		wallColor[1] = vec3(0.25, 0.5, 0.25);
		wallColor[2] = vec3(0.1, 0.1, 0.1);
		wallColor[3] = vec3(0.5, 0.5, 0.5);
		wallColor[4] = vec3(2.0, 2.0, 2.0);
		wallReflection[0] = vec3(0.5, 0.5, 0.8);
		wallReflection[1] = vec3(0.25, 0.5, 0.25);
		wallReflection[2] = vec3(0.1, 0.1, 0.1);
		wallReflection[3] = vec3(0.4, 0.4, 0.4);
		wallReflection[4] = vec3(0.1, 0.1, 0.1);


		vec3 color = vec3(0.0);
		/*
		const float diffuse = 0.8;
		for (float iter = 0.0; iter < max_iter; iter += 1.0) {
			TraceData ray;
			ray.pos = cameraPosition;
			ray.dir = normalize(vTextureCoord);
			ray.col = vec3(0.0);
			ray.reflection = vec3(1.0);
			// Marching
			ray = traceRay(ray, iter);
			// Get color
			color += ray.col * mix(1.0, mix(1.0 - diffuse, diffuse / (max_iter - 1.0), step(1.0, iter)), step(2.0, max_iter));
		}
		*/
		{
			TraceData ray;
			ray.pos = cameraPosition;
			ray.dir = normalize(vTextureCoord);
			ray.col = vec3(0.0);
			ray.reflection = vec3(1.0);
			// Marching
			ray = traceRay(ray, 0.0);
			// Get color
			color = ray.col;
		}
		fragmentColor = vec4(clamp(exposure * color, 0.0, 1.0), 1.0);
	}
`;



window.onload = init;

function init() {
	// Initialize HTML
	// max iteration count
	const max_iterInput = document.getElementById("maxIterationCount");
	max_iterInput.value = max_iter;
	max_iterInput.addEventListener(
	    "change",
	    function () {
		    max_iter = parseFloat(max_iterInput.value);
		    if (max_iter < 1.0) {
			    max_iter = 1.0;
		    }
	    });
	const max_iterInputIncrement = document.getElementById("maxIterationCountInc");
	const max_iterIncrementer = () => { max_iter = parseFloat(max_iterInput.value) + 1.0; max_iterInput.value = max_iter; };
	max_iterInputIncrement.addEventListener("mousedown", max_iterIncrementer);
	max_iterInputIncrement.addEventListener("touchstart", max_iterIncrementer);
	const max_iterInputDecrement = document.getElementById("maxIterationCountDec");
	const max_iterDecrementer = () => { max_iter = Math.max(parseFloat(max_iterInput.value) - 1.0, 1.0); max_iterInput.value = max_iter; };
	max_iterInputDecrement.addEventListener("mousedown", max_iterDecrementer);
	max_iterInputDecrement.addEventListener("touchstart", max_iterDecrementer);
	// max bound count
	const max_boundInput = document.getElementById("maxBoundCount");
	max_boundInput.value = max_bound;
	max_boundInput.addEventListener(
	    "change",
	    function () {
		    max_bound = parseInt(max_boundInput.value, 10);
		    if (max_bound <= 0) {
			    max_bound = 1;
		    }
	    });
	const max_boundInputIncrement = document.getElementById("maxBoundCountInc");
	const max_boundIncrementer = () => { max_bound = parseInt(max_boundInput.value, 10) + 1; max_boundInput.value = max_bound; };
	max_boundInputIncrement.addEventListener("mousedown", max_boundIncrementer);
	max_boundInputIncrement.addEventListener("touchstart", max_boundIncrementer);
	const max_boundInputDecrement = document.getElementById("maxBoundCountDec");
	const max_boundDecrementer = () => { max_bound = Math.max(parseInt(max_boundInput.value, 10) - 1, 1); max_boundInput.value = max_bound; };
	max_boundInputDecrement.addEventListener("mousedown", max_boundDecrementer);
	max_boundInputDecrement.addEventListener("touchstart", max_boundDecrementer);

	// Start WebGL
	glmain();
}

function glmain() {
	const canvas = document.querySelector('#glcanvas');

	// Get WebGL instance
	const gl = canvas.getContext('webgl2', { antialias: true });
	// If we don't have a GL context, give up now
	if (!gl) {
		alert('Unable to initialize WebGL. Your browser or machine may not support it.');
		return;
	}

	// Initialize a shader program; this is where all the lighting
	// for the vertices and so forth is established.
	const renderShaderProgram = initShaderProgram(gl, vsSource, fsSource);

	// Collect all the info needed to use the shader program.
	// Look up which attributes our shader program is using
	// for aVertexPosition, aVevrtexColor and also
	// look up uniform locations.
	const renderProgramInfo = {
		shaderProgram: renderShaderProgram,
		attribLocations: {
			vertexPosition: gl.getAttribLocation(renderShaderProgram, 'vertexPosition'),
			vertexTextureCoord: gl.getAttribLocation(renderShaderProgram, 'vertexTextureCoord'),
		},
		uniformLocations: {
			seed: gl.getUniformLocation(renderShaderProgram, 'seed'),
			texture: gl.getUniformLocation(renderShaderProgram, 'texture'),
			textureMatrix: gl.getUniformLocation(renderShaderProgram, 'textureMatrix'),
			cameraPosition: gl.getUniformLocation(renderShaderProgram, 'cameraPosition'),
			wallOffset: gl.getUniformLocation(renderShaderProgram, 'wallOffset'),
			numberOfSphere: gl.getUniformLocation(renderShaderProgram, 'numberOfSphere'),
			spherePosition: spherePositions.map((x, ind) => {
				return gl.getUniformLocation(renderShaderProgram, 'spherePosition[' + ind + ']');
			    }),
			sphereRadius: sphereRadiuses.map((x, ind) => {
				return gl.getUniformLocation(renderShaderProgram, 'sphereRadius[' + ind + ']');
			    }),
			max_iter: gl.getUniformLocation(renderShaderProgram, 'max_iter'),
			max_bound: gl.getUniformLocation(renderShaderProgram, 'max_bound'),
		},
	};

	const screen = createScreen();
	const screenBuffers = createVBO(gl, screen);
	const textures = createTexture(gl);

	// Draw the scene repeatedly
	let count = 0;
	function render(now) {
		cameraPosition[0] = Math.sin(2.0 * Math.PI * count / 300) * 0.1;
		//spherePositions[0][0] = Math.cos(2.0 * Math.PI * count / 217) * 0.9;
		/*spherePositions[0][1] = Math.sin(2.0 * Math.PI * count / 217) * 0.2;
		sphereRadiuses[2] = 0.17 +
		    0.025 * Math.pow(Math.sin(2.0 * Math.PI * count / 211), 512.0) +
		    0.025 * Math.pow(Math.sin(2.0 * Math.PI * (count + 7) / 211), 512.0);
		    */
		++count;
		drawScene(gl, renderProgramInfo, textures, screenBuffers);

		requestAnimationFrame(render);
	}
	requestAnimationFrame(render);
}


function createScreen() {
	const positions = [
		-1.0, -1.0,  0.0,
		 1.0, -1.0,  0.0,
		 1.0,  1.0,  0.0,
		-1.0,  1.0,  0.0,
	];

	const indices = [
		0, 1, 2, 0, 2, 3,
	];

	const texcoords = [
		-1.0, -1.0, 1.0,
		 1.0, -1.0, 1.0,
		 1.0,  1.0, 1.0,
		-1.0,  1.0, 1.0,
	];

	return {
		positions: positions,
		texcoords: texcoords,
		indices: indices,
	};
}

function createVBO(gl, data) {
	// Bind buffers
	let positionBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
	gl.bufferData(
			gl.ARRAY_BUFFER,
			new Float32Array(data.positions),
			gl.STATIC_DRAW);

	let texcoordBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
	gl.bufferData(
		gl.ARRAY_BUFFER,
		new Float32Array(data.texcoords),
		gl.STATIC_DRAW);

	let indexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
	gl.bufferData(
		gl.ELEMENT_ARRAY_BUFFER,
		new Uint16Array(data.indices),
		gl.STATIC_DRAW);

	return {
		positions: {
			data: positionBuffer,
			numComponents: 3,
			type: gl.FLOAT,
			normalize: false,
		},
		texcoords: {
			data: texcoordBuffer,
			numComponents: 3,
			type: gl.FLOAT,
			normalize: false,
		},
		indices: indexBuffer,
		vertexCount: data.indices.length,
	};
}

function createTexture(gl) {
	//const img = document.getElementById("textureImage");

	const tx = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, tx);
	//gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1024, 1024, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

	return [tx];
}

function initShaderProgram(gl, vsSource, fsSource) {
	let vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
	let fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

	let shaderProgram = gl.createProgram();
	gl.attachShader(shaderProgram, vertexShader);
	gl.attachShader(shaderProgram, fragmentShader);
	gl.linkProgram(shaderProgram);

	if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
		alert("Unable to initialize the shader program: " + gl.getProgramInfoLog(shaderProgram));
		return null;
	}
	return shaderProgram;
}

function loadShader(gl, type, source) {
	let shader = gl.createShader(type);
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		alert("Failed to compile the shader program: " + gl.getShaderInfoLog(shader));
		gl.deleteShader(shader);
		return null;
	}
	return shader;
}

function drawScene(gl, renderProgramInfo, textures, screenBuffers)
{
	////////////////////////////////////////////////////////////////
	// Render
	////////////////////////////////////////////////////////////////
	gl.useProgram(renderProgramInfo.shaderProgram);

	gl.clearColor(0.0, 0.0, 0.0, 1.0); // Clear with black
	gl.clearDepth(1.0); // Clear everything
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DETPH_BUFFER_BIT);

	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, textures[0]);

	const textureMatrix = createIdenticalMat3();
	textureMatrix[0] = 0.5; textureMatrix[4] = -0.5; // Scale
	textureMatrix[6] = 0.5; textureMatrix[7] = 0.5; // Shift

	gl.uniform1f(
	    renderProgramInfo.uniformLocations.seed,
	    Math.random() * 10.0);
	gl.uniform1i(
	    renderProgramInfo.uniformLocations.texture,
	    0);
	gl.uniformMatrix3fv(
	    renderProgramInfo.uniformLocations.textureMatrix,
	    false,
	    textureMatrix);
	gl.uniform3fv(
	    renderProgramInfo.uniformLocations.cameraPosition,
	    cameraPosition);
	gl.uniform1f(
	    renderProgramInfo.uniformLocations.wallOffset,
	    wallOffset);
	gl.uniform1i(
	    renderProgramInfo.uniformLocations.numberOfSphere,
	    //Math.min(spherePositions.length, sphereRadiuses.length));
	    spherePositions.length);
	gl.uniform1f(
	    renderProgramInfo.uniformLocations.max_iter,
	    max_iter);
	gl.uniform1i(
	    renderProgramInfo.uniformLocations.max_bound,
	    max_bound);
	for (let i = 0; i < spherePositions.length; i++) {
		gl.uniform3fv(
		    renderProgramInfo.uniformLocations.spherePosition[i],
		    spherePositions[i]);
		gl.uniform1f(
		    renderProgramInfo.uniformLocations.sphereRadius[i],
		    sphereRadiuses[i]);
	}

	enableAttribute(gl, renderProgramInfo.attribLocations, screenBuffers);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, screenBuffers.indices);
	gl.drawElements(gl.TRIANGLES, screenBuffers.vertexCount, gl.UNSIGNED_SHORT, 0);
}

function enableAttribute(gl, locations, buffers) {
	let stride = 0;
	let offset = 0;
	// Positions
	{
		gl.bindBuffer(gl.ARRAY_BUFFER, buffers.positions.data);
		gl.vertexAttribPointer(
			locations.vertexPosition,
			buffers.positions.numComponents,
			buffers.positions.type,
			buffers.positions.normalize,
			stride,
			offset);
		gl.enableVertexAttribArray(locations.vertexPosition);
	}
	// Texture Coords
	{
		gl.bindBuffer(gl.ARRAY_BUFFER, buffers.texcoords.data);
		gl.vertexAttribPointer(
			locations.vertexTextureCoord,
			buffers.texcoords.numComponents,
			buffers.texcoords.type,
			buffers.texcoords.normalize,
			stride,
			offset);
		gl.enableVertexAttribArray(locations.vertexTextureCoord);
	}
}

function createIdenticalMat3() {
	let A = new Array(9);
	A[0] = 1.0; A[3] = 0.0; A[6] = 0.0;
	A[1] = 0.0; A[4] = 1.0; A[7] = 0.0;
	A[2] = 0.0; A[5] = 0.0; A[8] = 1.0;
	return A;
}

function createIdenticalMat4() {
	let A = new Array(16);
	A[0] = 1.0; A[4] = 0.0; A[8]  = 0.0; A[12] = 0.0;
	A[1] = 0.0; A[5] = 1.0; A[9]  = 0.0; A[13] = 0.0;
	A[2] = 0.0; A[6] = 0.0; A[10] = 1.0; A[14] = 0.0;
	A[3] = 0.0; A[7] = 0.0; A[11] = 0.0; A[15] = 1.0;
	return A;
}

