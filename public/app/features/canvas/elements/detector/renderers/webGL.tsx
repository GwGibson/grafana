import React, { useRef, useEffect } from 'react';

import { VIEWBOX_LAYOUT } from '../utils/layout';

import { RenderProps } from './sharedTypes';

// Helper to create shader programs (only created once)
const createShaderProgram = (gl: WebGLRenderingContext, vsSource: string, fsSource: string) => {
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    if (!vertexShader) { throw new Error('Failed to create vertex shader'); }
    gl.shaderSource(vertexShader, vsSource);
    gl.compileShader(vertexShader);

    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
        console.error('Vertex shader compilation failed:', gl.getShaderInfoLog(vertexShader));
        gl.deleteShader(vertexShader);
        return null;
    }

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    if (!fragmentShader) { throw new Error('Failed to create fragment shader'); }
    gl.shaderSource(fragmentShader, fsSource);
    gl.compileShader(fragmentShader);

    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
        console.error('Fragment shader compilation failed:', gl.getShaderInfoLog(fragmentShader));
        gl.deleteShader(fragmentShader);
        gl.deleteShader(vertexShader);
        return null;
    }

    const program = gl.createProgram();
    if (!program) { throw new Error('Failed to create shader program'); }
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Program linking failed:', gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);
        return null;
    }

    return program;
};

const hexToRgb = (hex: string): [number, number, number] => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return [r, g, b];
};

// Function to create semi-circle vertices
const createSemiCircleVertices = (segments = 16) => {
    const vertices = [0, 0];
    const angleStep = Math.PI / segments;
    for (let i = 0; i <= segments; i++) {
        const angle = i * angleStep;
        const x = Math.cos(angle);
        const y = Math.sin(angle);
        vertices.push(x, y);
    }

    return vertices;
};

export const DetectorWebGLCanvas: React.FC<RenderProps> = ({ detectorComponentData, data }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const programsRef = useRef<{
        hexagonProgram: WebGLProgram | null;
        sensorProgram: WebGLProgram | null;
    }>({ hexagonProgram: null, sensorProgram: null });

    // Cache for frequently used WebGL resources
    const resourcesRef = useRef<{
        semiCircleVertices: Float32Array | null;
        semiCircleBuffer: WebGLBuffer | null;
    }>({ semiCircleVertices: null, semiCircleBuffer: null });

    // Setup WebGL resources once, then render whenever sensor colors change
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) { return; }
        const gl = canvas.getContext('webgl', {
            antialias: true,
            preserveDrawingBuffer: false,
            premultipliedAlpha: true,
            alpha: true
        });
        if (!gl) {
            console.error('WebGL not supported');
            return;
        }

        gl.clearColor(0.0, 0.0, 0.0, 0.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        // Only create shader programs if they don't exist
        if (!programsRef.current.hexagonProgram) {
            const hexagonVsSource = `
                attribute vec2 aPosition;
                attribute vec3 aColor;
                varying vec3 vColor;
                uniform vec2 uResolution;
                
                void main() {
                    // Convert from pixel space to clip space
                    vec2 zeroToOne = aPosition / uResolution;
                    vec2 zeroToTwo = zeroToOne * 2.0;
                    vec2 clipSpace = zeroToTwo - 1.0;
                    
                    gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
                    vColor = aColor;
                }
            `;

            // Fragment shader for colored shapes
            const fsSource = `
                precision mediump float;
                varying vec3 vColor;
                
                void main() {
                    gl_FragColor = vec4(vColor, 1.0);
                }
            `;

            programsRef.current.hexagonProgram = createShaderProgram(gl, hexagonVsSource, fsSource);

            // Instanced vertex shader for sensors
            const sensorVsSource = `
                attribute vec2 aPosition;
                attribute vec3 aColor;
                attribute vec2 aTranslation;
                attribute float aRotation;
                attribute float aScale;
                attribute float aSweepFlag;
                
                varying vec3 vColor;
                uniform vec2 uResolution;
                
                void main() {
                    // Apply sweep flag (flip if needed)
                    vec2 position = aPosition;
                    position.y = position.y * (aSweepFlag * 2.0 - 1.0);
                    
                    // Apply rotation
                    float cosR = cos(aRotation);
                    float sinR = sin(aRotation);
                    vec2 rotated = vec2(
                        position.x * cosR - position.y * sinR,
                        position.x * sinR + position.y * cosR
                    );
                    
                    // Apply scale and translation
                    vec2 final = rotated * aScale + aTranslation;
                    
                    // Convert to clip space
                    vec2 zeroToOne = final / uResolution;
                    vec2 zeroToTwo = zeroToOne * 2.0;
                    vec2 clipSpace = zeroToTwo - 1.0;
                    
                    gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
                    vColor = aColor;
                }
            `;

            programsRef.current.sensorProgram = createShaderProgram(gl, sensorVsSource, fsSource);
            const semiCircleVerts = createSemiCircleVertices(16);
            resourcesRef.current.semiCircleVertices = new Float32Array(semiCircleVerts);
            const semiCircleBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, semiCircleBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, resourcesRef.current.semiCircleVertices, gl.STATIC_DRAW);
            resourcesRef.current.semiCircleBuffer = semiCircleBuffer;
        }

        if (!programsRef.current.hexagonProgram || !programsRef.current.sensorProgram) {
            console.error('Failed to initialize WebGL programs');
            return;
        }

        // RENDER HEXAGONS
        gl.useProgram(programsRef.current.hexagonProgram);
        const hexResolutionUniformLocation = gl.getUniformLocation(
            programsRef.current.hexagonProgram,
            'uResolution'
        );
        gl.uniform2f(
            hexResolutionUniformLocation,
            VIEWBOX_LAYOUT.VIEWBOX.WIDTH,
            VIEWBOX_LAYOUT.VIEWBOX.HEIGHT
        );

        const hexagonsByColor = detectorComponentData.hexagons.reduce((acc, hexagon) => {
            if (!acc[hexagon.color]) {
                acc[hexagon.color] = [];
            }
            acc[hexagon.color].push(hexagon);
            return acc;
        }, {} as Record<string, typeof detectorComponentData.hexagons>);

        const positionAttributeLocation = gl.getAttribLocation(
            programsRef.current.hexagonProgram,
            'aPosition'
        );
        const colorAttributeLocation = gl.getAttribLocation(
            programsRef.current.hexagonProgram,
            'aColor'
        );

        Object.entries(hexagonsByColor).forEach(([color, hexagons]) => {
            const colorRgb = hexToRgb(color);
            hexagons.forEach((hexagon) => {
                const { points } = hexagon;

                const positions = points.flatMap(p => [p.x, p.y]);
                const positionBuffer = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
                gl.enableVertexAttribArray(positionAttributeLocation);
                gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

                const colors = Array(points.length).fill(colorRgb).flat();
                const colorBuffer = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
                gl.enableVertexAttribArray(colorAttributeLocation);
                gl.vertexAttribPointer(colorAttributeLocation, 3, gl.FLOAT, false, 0, 0);

                gl.drawArrays(gl.TRIANGLE_FAN, 0, points.length);

                gl.deleteBuffer(positionBuffer);
                gl.deleteBuffer(colorBuffer);
            });
        });

        // RENDER SENSORS
        gl.useProgram(programsRef.current.sensorProgram);

        // Get the instancing extension if needed (for WebGL 1)
        const isWebGL2 = gl instanceof WebGL2RenderingContext;
        const ext = !isWebGL2 ? gl.getExtension('ANGLE_instanced_arrays') : null;
        const hasInstancing = isWebGL2 || ext !== null;

        const sensorResUniformLocation = gl.getUniformLocation(
            programsRef.current.sensorProgram,
            'uResolution'
        );
        gl.uniform2f(
            sensorResUniformLocation,
            VIEWBOX_LAYOUT.VIEWBOX.WIDTH,
            VIEWBOX_LAYOUT.VIEWBOX.HEIGHT
        );

        const positionLocation = gl.getAttribLocation(programsRef.current.sensorProgram, 'aPosition');
        gl.bindBuffer(gl.ARRAY_BUFFER, resourcesRef.current.semiCircleBuffer!);
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

        const colorLocation = gl.getAttribLocation(programsRef.current.sensorProgram, 'aColor');
        const translationLocation = gl.getAttribLocation(programsRef.current.sensorProgram, 'aTranslation');
        const rotationLocation = gl.getAttribLocation(programsRef.current.sensorProgram, 'aRotation');
        const scaleLocation = gl.getAttribLocation(programsRef.current.sensorProgram, 'aScale');
        const sweepFlagLocation = gl.getAttribLocation(programsRef.current.sensorProgram, 'aSweepFlag');

        // Process sensors by color+isDark to minimize state changes
        const groupedSensors = detectorComponentData.sensors.reduce(
            (acc, sensor) => {
                const key = `${sensor.fillColor}-${sensor.isDark}`;
                if (!acc[key]) {
                    acc[key] = [];
                }
                acc[key].push(sensor);
                return acc;
            },
            {} as Record<string, typeof detectorComponentData.sensors>
        );

        const vertexCount = resourcesRef.current.semiCircleVertices!.length / 2;

        Object.entries(groupedSensors).forEach(([key, sensors]) => {
            const [fillColor] = key.split('-');
            const colorRgb = hexToRgb(fillColor);
            if (hasInstancing && sensors.length > 1) {
                // Set up color (same for all vertices in this batch)
                const colorBuffer = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
                const colors = Array(vertexCount).fill(colorRgb).flat();
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
                gl.enableVertexAttribArray(colorLocation);
                gl.vertexAttribPointer(colorLocation, 3, gl.FLOAT, false, 0, 0);

                // Translation buffer
                const translationBuffer = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, translationBuffer);
                const translations = new Float32Array(sensors.flatMap(s => [...s.scaledPosition]));
                gl.bufferData(gl.ARRAY_BUFFER, translations, gl.STATIC_DRAW);
                gl.enableVertexAttribArray(translationLocation);
                gl.vertexAttribPointer(translationLocation, 2, gl.FLOAT, false, 0, 0);

                // Rotation buffer
                const rotationBuffer = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, rotationBuffer);
                const rotations = sensors.map(s => (s.rotation * Math.PI) / 180);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(rotations), gl.STATIC_DRAW);
                gl.enableVertexAttribArray(rotationLocation);
                gl.vertexAttribPointer(rotationLocation, 1, gl.FLOAT, false, 0, 0);

                // Scale buffer
                const scaleBuffer = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, scaleBuffer);
                const scales = sensors.map(s => s.radius);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(scales), gl.STATIC_DRAW);
                gl.enableVertexAttribArray(scaleLocation);
                gl.vertexAttribPointer(scaleLocation, 1, gl.FLOAT, false, 0, 0);

                // Sweep flag buffer
                const sweepFlagBuffer = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, sweepFlagBuffer);
                const sweepFlags = sensors.map(s => s.sweepFlag);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sweepFlags), gl.STATIC_DRAW);
                gl.enableVertexAttribArray(sweepFlagLocation);
                gl.vertexAttribPointer(sweepFlagLocation, 1, gl.FLOAT, false, 0, 0);

                // Set divisors for instancing
                if (isWebGL2) {
                    (gl as WebGL2RenderingContext).vertexAttribDivisor(translationLocation, 1);
                    (gl as WebGL2RenderingContext).vertexAttribDivisor(rotationLocation, 1);
                    (gl as WebGL2RenderingContext).vertexAttribDivisor(scaleLocation, 1);
                    (gl as WebGL2RenderingContext).vertexAttribDivisor(sweepFlagLocation, 1);
                } else {
                    ext!.vertexAttribDivisorANGLE(translationLocation, 1);
                    ext!.vertexAttribDivisorANGLE(rotationLocation, 1);
                    ext!.vertexAttribDivisorANGLE(scaleLocation, 1);
                    ext!.vertexAttribDivisorANGLE(sweepFlagLocation, 1);
                }

                // Draw all sensors in this group with one draw call
                if (isWebGL2) {
                    (gl as WebGL2RenderingContext).drawArraysInstanced(
                        gl.TRIANGLE_FAN,
                        0,
                        vertexCount,
                        sensors.length
                    );
                } else {
                    ext!.drawArraysInstancedANGLE(
                        gl.TRIANGLE_FAN,
                        0,
                        vertexCount,
                        sensors.length
                    );
                }

                if (isWebGL2) {
                    (gl as WebGL2RenderingContext).vertexAttribDivisor(translationLocation, 0);
                    (gl as WebGL2RenderingContext).vertexAttribDivisor(rotationLocation, 0);
                    (gl as WebGL2RenderingContext).vertexAttribDivisor(scaleLocation, 0);
                    (gl as WebGL2RenderingContext).vertexAttribDivisor(sweepFlagLocation, 0);
                } else {
                    ext!.vertexAttribDivisorANGLE(translationLocation, 0);
                    ext!.vertexAttribDivisorANGLE(rotationLocation, 0);
                    ext!.vertexAttribDivisorANGLE(scaleLocation, 0);
                    ext!.vertexAttribDivisorANGLE(sweepFlagLocation, 0);
                }

                gl.deleteBuffer(colorBuffer);
                gl.deleteBuffer(translationBuffer);
                gl.deleteBuffer(rotationBuffer);
                gl.deleteBuffer(scaleBuffer);
                gl.deleteBuffer(sweepFlagBuffer);
            } else {
                // Fallback to non-instanced rendering (optimized batch)
                // 1. Use a single shared buffer for the semi-circle geometry
                // 2. Group by color to minimize state changes
                // Set up color (same for all vertices & sensors in this group)
                const colorBuffer = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
                const colors = Array(vertexCount).fill(colorRgb).flat();
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
                gl.enableVertexAttribArray(colorLocation);
                gl.vertexAttribPointer(colorLocation, 3, gl.FLOAT, false, 0, 0);

                sensors.forEach((sensor) => {
                    // Translation
                    const translationBuffer = gl.createBuffer();
                    gl.bindBuffer(gl.ARRAY_BUFFER, translationBuffer);
                    gl.bufferData(
                        gl.ARRAY_BUFFER,
                        new Float32Array(sensor.scaledPosition),
                        gl.STATIC_DRAW
                    );
                    gl.enableVertexAttribArray(translationLocation);
                    gl.vertexAttribPointer(translationLocation, 2, gl.FLOAT, false, 0, 0);

                    // Rotation
                    const rotationBuffer = gl.createBuffer();
                    gl.bindBuffer(gl.ARRAY_BUFFER, rotationBuffer);
                    const rotationRadians = (sensor.rotation * Math.PI) / 180;
                    gl.bufferData(
                        gl.ARRAY_BUFFER,
                        new Float32Array([rotationRadians]),
                        gl.STATIC_DRAW
                    );
                    gl.enableVertexAttribArray(rotationLocation);
                    gl.vertexAttribPointer(rotationLocation, 1, gl.FLOAT, false, 0, 0);

                    // Scale
                    const scaleBuffer = gl.createBuffer();
                    gl.bindBuffer(gl.ARRAY_BUFFER, scaleBuffer);
                    gl.bufferData(
                        gl.ARRAY_BUFFER,
                        new Float32Array([sensor.radius]),
                        gl.STATIC_DRAW
                    );
                    gl.enableVertexAttribArray(scaleLocation);
                    gl.vertexAttribPointer(scaleLocation, 1, gl.FLOAT, false, 0, 0);

                    // Sweep flag
                    const sweepFlagBuffer = gl.createBuffer();
                    gl.bindBuffer(gl.ARRAY_BUFFER, sweepFlagBuffer);
                    gl.bufferData(
                        gl.ARRAY_BUFFER,
                        new Float32Array([sensor.sweepFlag]),
                        gl.STATIC_DRAW
                    );
                    gl.enableVertexAttribArray(sweepFlagLocation);
                    gl.vertexAttribPointer(sweepFlagLocation, 1, gl.FLOAT, false, 0, 0);
                    gl.drawArrays(gl.TRIANGLE_FAN, 0, vertexCount);
                    gl.deleteBuffer(translationBuffer);
                    gl.deleteBuffer(rotationBuffer);
                    gl.deleteBuffer(scaleBuffer);
                    gl.deleteBuffer(sweepFlagBuffer);
                });
                gl.deleteBuffer(colorBuffer);
            }
        });

    }, [detectorComponentData, data]);

    return (
        <canvas
            ref={canvasRef}
            width={VIEWBOX_LAYOUT.VIEWBOX.WIDTH}
            height={VIEWBOX_LAYOUT.VIEWBOX.HEIGHT}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
        />
    );
};
