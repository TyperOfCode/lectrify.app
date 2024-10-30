import sounddevice as sd
import numpy as np
import whisper
import threading
import queue
import time
import random

from inference import extractQuestion, determineRelevancyAndStandalone, generateMultipleChoice
from handler import sendQuestion

model = whisper.load_model("small.en")


sampling_rate = 16000
block_duration = 2
speech_pause_duration = 0.5
volume_threshold = 0.2


audio_queue = queue.Queue()

textGot = ""

themes = ["Computer Science", "Technology", "Programming"]


audio_buffer = []
last_speech_time = 0
speech_detected = False

# audio callback
def audio_callback(indata, frames, time, status):
    if status:
        print(status)

    audio_queue.put(indata.copy())
    
# process audio buffer
def process_audio_buffer():
    global audio_buffer, textGot, themes
    

    if len(audio_buffer) == 0:
        return
    
    audio_data = np.concatenate(audio_buffer).flatten().astype(np.float32)
    audio_buffer = [] 
    

    result = model.transcribe(audio_data, fp16=False)

    textGot += result['text']
    textQuestion, usage = extractQuestion(textGot)

    if textQuestion.strip().lower()[:2] == "no":
        return

    print(f"-- question detected: '{textQuestion}'")
    textGot = ""

    relevant, usage = determineRelevancyAndStandalone(textQuestion, themes)
    
    if not relevant:
        print("-- determined not relevant")
        return

    print(f"\n\nQuestion generated: {textQuestion}\n\n")
    options, usage = generateMultipleChoice(textQuestion)
    
    answers : list = options.incorrectOptions + [options.correctOption]
    random.shuffle(answers)
    
    correctAnswerIdx = answers.index(options.correctOption)
    
    print(f"Options: {options.correctOption} {options.incorrectOptions}")
    print("Sending to server...")
    res = sendQuestion(textQuestion, answers, correctAnswerIdx)
    print(f"Response: {res}")
    
# transcribe audio
def transcribe_audio():
    global audio_buffer, last_speech_time, speech_detected
    
    while True:
        audio_data = audio_queue.get()

        audio_data = audio_data.flatten().astype(np.float32)
        

        if np.max(np.abs(audio_data)) >= volume_threshold:
            speech_detected = True
            last_speech_time = time.time()
            audio_buffer.append(audio_data)
            print(f"Speech detected: {np.max(np.abs(audio_data))}...")
        else:
            print(f"[X] {round(np.max(np.abs(audio_data)), 3)} ... ")
            if speech_detected and time.time() - last_speech_time >= speech_pause_duration:
                print("Pause detected, processing accumulated audio...")
                process_audio_buffer()
                speech_detected = False

def main():

    with sd.InputStream(callback=audio_callback, channels=1,
                        samplerate=sampling_rate,
                        blocksize=int(sampling_rate * block_duration)):

        threading.Thread(target=transcribe_audio, daemon=True).start()
        
        print("\n"*100)
        
        print(sd.query_devices())
        input("Press Enter to stop the program...\n")

if __name__ == "__main__":
    main()
