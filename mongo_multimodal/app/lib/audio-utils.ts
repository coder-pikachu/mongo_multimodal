/**
 * Audio utility functions for Gemini Live API
 * Handles PCM audio conversion and encoding/decoding for voice interactions
 */

import { Blob } from '@google/genai';

/**
 * Convert Float32Array PCM data to Int16 and encode as base64
 * Used for sending microphone input to Gemini Live API
 *
 * @param data Float32Array PCM data (-1 to 1 range)
 * @returns Gemini Blob object with base64 encoded Int16 PCM
 */
export function createBlob(data: Float32Array): Blob {
  const length = data.length;
  const int16 = new Int16Array(length);

  // Convert Float32 (-1 to 1) to Int16 (-32768 to 32767)
  for (let i = 0; i < length; i++) {
    const sample = Math.max(-1, Math.min(1, data[i])); // Clamp to valid range
    int16[i] = sample * 32768;
  }

  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

/**
 * Encode Uint8Array to base64 string
 *
 * @param bytes Uint8Array to encode
 * @returns Base64 encoded string
 */
export function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Decode base64 string to Uint8Array
 *
 * @param base64 Base64 encoded string
 * @returns Uint8Array of decoded data
 */
export function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Decode PCM data to AudioBuffer for playback
 * Converts Int16 PCM to Float32 format expected by Web Audio API
 *
 * @param data Uint8Array containing Int16 PCM data
 * @param ctx AudioContext for creating buffer
 * @param sampleRate Sample rate (e.g., 24000 for Gemini output)
 * @param numChannels Number of audio channels (1 for mono)
 * @returns AudioBuffer ready for playback
 */
export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number
): Promise<AudioBuffer> {
  const buffer = ctx.createBuffer(
    numChannels,
    data.length / 2 / numChannels, // 2 bytes per Int16 sample
    sampleRate
  );

  // Convert Int16 to Float32
  const dataInt16 = new Int16Array(data.buffer);
  const length = dataInt16.length;
  const dataFloat32 = new Float32Array(length);

  for (let i = 0; i < length; i++) {
    dataFloat32[i] = dataInt16[i] / 32768.0; // Normalize to -1 to 1 range
  }

  // Handle channel interleaving if needed
  if (numChannels === 1) {
    buffer.copyToChannel(dataFloat32, 0);
  } else {
    // Deinterleave multiple channels
    for (let i = 0; i < numChannels; i++) {
      const channel = dataFloat32.filter(
        (_, index) => index % numChannels === i
      );
      buffer.copyToChannel(channel, i);
    }
  }

  return buffer;
}
