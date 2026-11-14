export interface CameraSceneConfig {
  defaultPosition: [number, number, number]
  defaultTarget: [number, number, number]
  minDistance: number
  maxDistance: number
  minPolarAngle?: number
  maxPolarAngle?: number
}

export const CAMERA_CONFIGS = {
  spacecraft: {
    defaultPosition: [4.4, 2.6, 5.6] as [number, number, number],
    defaultTarget: [0, 0, 0] as [number, number, number],
    minDistance: 1.2,
    maxDistance: 14,
    minPolarAngle: 0.05,
    maxPolarAngle: Math.PI - 0.05,
  },
  rocket: {
    defaultPosition: [3.4, 1.8, 4.6] as [number, number, number],
    defaultTarget: [0, 1.2, 0] as [number, number, number],
    minDistance: 1.5,
    maxDistance: 16,
    minPolarAngle: 0.05,
    maxPolarAngle: Math.PI - 0.05,
  },
  planet: {
    defaultPosition: [0, 0, 3.2] as [number, number, number],
    defaultTarget: [0, 0, 0] as [number, number, number],
    minDistance: 1.5,
    maxDistance: 8,
    minPolarAngle: 0.05,
    maxPolarAngle: Math.PI - 0.05,
  },
  trajectory: {
    defaultPosition: [0, 16, 18] as [number, number, number],
    defaultTarget: [3, 0, 0] as [number, number, number],
    minDistance: 3,
    maxDistance: 60,
    minPolarAngle: 0.05,
    maxPolarAngle: Math.PI / 2 + 0.35,
  },
  simulation: {
    defaultPosition: [3.5, 3.8, 6.5] as [number, number, number],
    defaultTarget: [0, 0, 0] as [number, number, number],
    minDistance: 1.5,
    maxDistance: 50,
    minPolarAngle: 0.05,
    maxPolarAngle: Math.PI - 0.05,
  },
}

