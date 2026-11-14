import { useEffect, useState } from 'react'
import * as THREE from 'three'
import { createEarthCloudTexture, createEarthTexture } from './textureGenerators'

// NASA Blue Marble-derived maps shipped with the three.js examples, served by jsDelivr.
const TEXTURE_BASE = 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r160/examples/textures/planets/'

export interface EarthTextures {
  day: THREE.Texture
  specular?: THREE.Texture
  clouds: THREE.Texture
  photographic: boolean
}

let cache: Promise<EarthTextures> | null = null

function loadOnce(): Promise<EarthTextures> {
  if (cache) return cache
  const loader = new THREE.TextureLoader()
  loader.setCrossOrigin('anonymous')
  const load = (name: string) =>
    new Promise<THREE.Texture>((resolve, reject) => loader.load(TEXTURE_BASE + name, resolve, undefined, reject))
  cache = Promise.all([load('earth_atmos_2048.jpg'), load('earth_specular_2048.jpg'), load('earth_clouds_1024.png')])
    .then(([day, specular, clouds]) => {
      day.colorSpace = THREE.SRGBColorSpace
      clouds.colorSpace = THREE.SRGBColorSpace
      day.anisotropy = 8
      return { day, specular, clouds, photographic: true }
    })
    .catch(() => ({
      // Offline fallback: procedural planet
      day: createEarthTexture(1024, 512),
      clouds: createEarthCloudTexture(1024, 512),
      photographic: false,
    }))
  return cache
}

/** Shared, cached Earth textures (photographic when online, procedural offline). */
export function useEarthTextures() {
  const [textures, setTextures] = useState<EarthTextures | null>(null)
  useEffect(() => {
    let alive = true
    loadOnce().then((t) => alive && setTextures(t))
    return () => {
      alive = false
    }
  }, [])
  return textures
}
