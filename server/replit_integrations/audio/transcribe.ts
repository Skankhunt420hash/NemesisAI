import OpenAI from "openai";
import { spawn } from "child_process";
import { Readable } from "stream";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

async function convertToWav(inputBuffer: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const tempInput = path.join(os.tmpdir(), `input-${Date.now()}.webm`);
    const tempOutput = path.join(os.tmpdir(), `output-${Date.now()}.wav`);
    
    fs.writeFileSync(tempInput, inputBuffer);
    
    const ffmpeg = spawn("ffmpeg", [
      "-y",
      "-i", tempInput,
      "-ar", "16000",
      "-ac", "1",
      "-c:a", "pcm_s16le",
      tempOutput,
    ]);
    
    ffmpeg.on("close", (code) => {
      try {
        if (code === 0 && fs.existsSync(tempOutput)) {
          const wavBuffer = fs.readFileSync(tempOutput);
          fs.unlinkSync(tempInput);
          fs.unlinkSync(tempOutput);
          resolve(wavBuffer);
        } else {
          fs.unlinkSync(tempInput);
          reject(new Error(`FFmpeg exited with code ${code}`));
        }
      } catch (err) {
        reject(err);
      }
    });
    
    ffmpeg.on("error", (err) => {
      try {
        fs.unlinkSync(tempInput);
      } catch {}
      reject(err);
    });
  });
}

export async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  try {
    const wavBuffer = await convertToWav(audioBuffer);
    
    const file = new File([wavBuffer], "audio.wav", { type: "audio/wav" });
    
    const response = await openai.audio.transcriptions.create({
      file,
      model: "gpt-4o-mini-transcribe",
      response_format: "json",
    });
    
    return response.text;
  } catch (err: any) {
    console.error("[transcribe] Error:", err.message);
    throw new Error("Failed to transcribe audio: " + err.message);
  }
}
