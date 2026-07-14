import json
import queue
import time
import asyncio
from flask import Flask, jsonify, request, Response
from flask_cors import CORS
import db
import math_engine
import threading
from tts import TTSEngine
from stt import STTEngine

app = Flask(__name__)
CORS(app)

# Global variables for engines (initialized lazily to ensure models are downloaded first)
tts_engine = None
stt_engine = None
engines_lock = threading.Lock()

def init_engines():
    global tts_engine, stt_engine
    with engines_lock:
        if tts_engine is None:
            tts_engine = TTSEngine()
        if stt_engine is None:
            stt_engine = STTEngine()

# Thread safety lock and SSE queues
clients_lock = threading.Lock()
sse_clients = []

current_drill = {
    "active": False,
    "expression": "",
    "spoken": "",
    "answer": None,
    "start_time": 0,
    "current_transcript": ""
}
current_drill_id = 0

def broadcast_event(event_type, data):
    payload = json.dumps({"type": event_type, "data": data})
    with clients_lock:
        for q in list(sse_clients):
            try:
                q.put(payload)
            except Exception:
                pass

@app.route('/api/profile', methods=['GET'])
def profile():
    user = db.get_user("Siddhesh")
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify(user)

@app.route('/api/stream')
def stream_events():
    def event_generator():
        q = queue.Queue()
        with clients_lock:
            sse_clients.append(q)
        try:
            # Send initial state
            q.put(json.dumps({"type": "init", "data": {"current_drill_active": current_drill["active"]}}))
            while True:
                data = q.get()
                yield f"data: {data}\n\n"
        except GeneratorExit:
            pass
        finally:
            with clients_lock:
                if q in sse_clients:
                    sse_clients.remove(q)
                    
    return Response(event_generator(), mimetype='text/event-stream')

def check_shutdown_command(text):
    normalized = text.lower()
    if "gwen" in normalized and "stop" in normalized and "today" in normalized:
        if any(code in normalized for code in ["code 00", "code zero zero", "code double zero", "code 0 0", "code00", "code double 0"]):
            print("Shutdown command recognized. Powering down...")
            try:
                if tts_engine:
                    tts_engine.speak("Understood. Powering down Gwen OS. Goodbye Siddhesh.")
            except Exception as e:
                print(f"Error playing shutdown voice: {e}")
            import os
            os._exit(0)

def run_drill_loop(my_drill_id):
    global current_drill, tts_engine, stt_engine, current_drill_id
    
    try:
        init_engines()
    except Exception as e:
        print(f"Error initializing speech engines: {e}")
        if current_drill_id == my_drill_id:
            broadcast_event("error", {"message": f"Speech engine init failed. Ensure models are downloaded. Error: {str(e)}"})
            current_drill["active"] = False
        return

    if current_drill_id != my_drill_id:
        return

    current_drill["active"] = True

    # 1. Fetch user stats
    user = db.get_user("Siddhesh")
    user_name = user["name"] if user else "Siddhesh"
    user_level = user["level"] if user else "Iron"
    user_mmr = user["mmr"] if user else 1000

    # 2. Conversational Greeting
    greeting_text = f"Welcome {user_name}. Your division level is {user_level} with {user_mmr} MMR. Should we start with our math routine?"
    
    broadcast_event("drill_started", {
        "expression": "System Greeting",
        "answer": 0,
        "status": "speaking"
    })
    broadcast_event("transcript", {
        "text": greeting_text,
        "is_final": True
    })

    tts_engine.speak(greeting_text)

    if current_drill_id != my_drill_id or not current_drill["active"]:
        return

    # 3. Listen for start affirmation
    broadcast_event("drill_status", {
        "status": "listening"
    })
    broadcast_event("transcript", {
        "text": "Waiting for: 'yes' / 'start' / 'sure'",
        "is_final": False
    })

    affirmation_received = False
    def on_greeting_speech(text, is_final):
        nonlocal affirmation_received
        if current_drill_id != my_drill_id:
            return
        check_shutdown_command(text)
        broadcast_event("transcript", {
            "text": text,
            "is_final": is_final
        })
        
        words = text.lower().split()
        affirmative_keywords = {"yes", "yeah", "yep", "sure", "start", "ok", "okay", "routine", "begin"}
        if any(w in affirmative_keywords for w in words):
            affirmation_received = True
            stt_engine.stop()
        elif any(w in {"no", "stop", "cancel", "quit", "exit"} for w in words):
            stt_engine.stop()

    def check_greeting_stop():
        return current_drill_id != my_drill_id or not current_drill["active"]

    stt_engine.listen(on_greeting_speech, stop_condition_fn=check_greeting_stop)

    if current_drill_id != my_drill_id or not current_drill["active"]:
        return

    if not affirmation_received:
        goodbye_text = "Understood. Let me know when you are ready to train."
        broadcast_event("drill_started", {
            "expression": "Routine Canceled",
            "answer": 0,
            "status": "speaking"
        })
        broadcast_event("transcript", {
            "text": goodbye_text,
            "is_final": True
        })
        tts_engine.speak(goodbye_text)
        current_drill["active"] = False
        broadcast_event("drill_stopped", {})
        return

    # User accepted!
    start_confirm_text = "Starting routine. Speak your answer when ready."
    broadcast_event("drill_started", {
        "expression": "Initializing Routine",
        "answer": 0,
        "status": "speaking"
    })
    broadcast_event("transcript", {
        "text": start_confirm_text,
        "is_final": True
    })
    tts_engine.speak(start_confirm_text)

    # 4. Continuous Routine Loop
    drill_count = 0
    while current_drill["active"] and current_drill_id == my_drill_id:
        drill_count += 1
        
        # Get active user stats to check level difficulty dynamically
        user = db.get_user("Siddhesh")
        user_mmr = user["mmr"] if user else 1000
        
        if user_mmr >= 1600:
            math_level = "Level 4 (Gold)"
        elif user_mmr >= 1400:
            math_level = "Level 3 (Silver)"
        elif user_mmr >= 1200:
            math_level = "Level 2 (Bronze)"
        else:
            math_level = "Level 1 (Iron)"
            
        spoken, expr, ans = math_engine.generate_drill(math_level)
        
        current_drill.update({
            "expression": expr,
            "spoken": spoken,
            "answer": ans,
            "start_time": time.time(),
            "current_transcript": ""
        })
        
        broadcast_event("drill_started", {
            "expression": f"{math_level}: {expr}",
            "answer": ans,
            "status": "speaking"
        })
        broadcast_event("transcript", {
            "text": f"Drill {drill_count}: {spoken}",
            "is_final": True
        })
        
        tts_engine.speak(spoken)
        
        if current_drill_id != my_drill_id or not current_drill["active"]:
            return
            
        current_drill["start_time"] = time.time()
        
        broadcast_event("drill_status", {
            "status": "listening"
        })
        broadcast_event("transcript", {
            "text": "",
            "is_final": False
        })
        
        def on_speech(text, is_final):
            nonlocal ans
            if current_drill_id != my_drill_id:
                return
            check_shutdown_command(text)
            current_drill["current_transcript"] = text
            broadcast_event("transcript", {
                "text": text,
                "is_final": is_final
            })
            
            is_correct = math_engine.evaluate_answer(text, ans)
            if is_correct:
                stt_engine.stop()
            elif is_final:
                # Stop on final wrong utterance to trigger failure
                stt_engine.stop()

        def check_stop():
            return current_drill_id != my_drill_id or not current_drill["active"]

        stt_engine.listen(on_speech, stop_condition_fn=check_stop)
        
        if current_drill_id != my_drill_id or not current_drill["active"]:
            return

        latency_ms = int((time.time() - current_drill["start_time"]) * 1000)
        final_text = current_drill["current_transcript"]
        
        is_correct = math_engine.evaluate_answer(final_text, ans)
        
        # Log to DB
        user_id = user["id"] if user else 1
        db.log_history(user_id, expr, is_correct, latency_ms)
        
        # Update MMR
        old_mmr = user["mmr"] if user else 1000
        new_mmr = old_mmr + 15 if is_correct else max(100, old_mmr - 10)
        db.update_mmr("Siddhesh", new_mmr)
        
        # Level check
        new_level = "Iron"
        if new_mmr >= 1600:
            new_level = "Gold"
        elif new_mmr >= 1400:
            new_level = "Silver"
        elif new_mmr >= 1200:
            new_level = "Bronze"
            
        conn = db.get_connection()
        c = conn.cursor()
        c.execute('UPDATE users SET level = ? WHERE name = ?', (new_level, "Siddhesh"))
        conn.commit()
        conn.close()

        if current_drill_id != my_drill_id:
            return

        # Broadcast results
        broadcast_event("drill_finished", {
            "expression": f"{math_level}: {expr}",
            "answer": ans,
            "is_correct": is_correct,
            "spoken_text": final_text,
            "latency_ms": latency_ms,
            "new_mmr": new_mmr,
            "new_level": new_level
        })
        
        if is_correct:
            feedback = f"Correct. The answer is {ans}."
        else:
            feedback = f"Incorrect. The answer is {ans}."
            
        tts_engine.speak(feedback)
        
        # Wait 1.0 second before automatically loading the next drill
        time.sleep(1.0)

    if current_drill_id == my_drill_id:
        current_drill["active"] = False

@app.route('/api/generate_drill', methods=['POST', 'GET'])
def start_drill():
    global current_drill, current_drill_id
    current_drill_id += 1
    # Start a new drill in a separate thread so Flask endpoints remain responsive
    if current_drill["active"]:
        current_drill["active"] = False
        if stt_engine:
            stt_engine.stop()
        time.sleep(0.25)
        
    thread = threading.Thread(target=run_drill_loop, args=(current_drill_id,), daemon=True)
    thread.start()
    return jsonify({"status": "starting"})

@app.route('/api/stop_drill', methods=['POST'])
def stop_drill():
    global current_drill
    current_drill["active"] = False
    if stt_engine:
        stt_engine.stop()
    broadcast_event("drill_stopped", {})
    return jsonify({"status": "stopped"})

@app.route('/api/history', methods=['GET'])
def history():
    conn = db.get_connection()
    c = conn.cursor()
    c.execute('SELECT expression, is_correct, latency_ms FROM history ORDER BY id DESC LIMIT 10')
    rows = c.fetchall()
    conn.close()
    
    history_list = []
    for r in rows:
        history_list.append({
            "expression": r[0],
            "is_correct": bool(r[1]),
            "latency_ms": r[2]
        })
    return jsonify(history_list)

def run_flask():
    app.run(port=5000, debug=False, use_reloader=False)

def load_engines_in_background():
    print("Pre-warming speech engines (loading Vosk and Kokoro models) in background...")
    try:
        init_engines()
        print("Speech engines pre-warmed successfully.")
    except Exception as e:
        print(f"Background engine pre-warming warning: {e}")

async def main_loop():
    db.init_db()
    # Eagerly load the speech engines in a background thread
    threading.Thread(target=load_engines_in_background, daemon=True).start()
    flask_thread = threading.Thread(target=run_flask, daemon=True)
    flask_thread.start()
    print("Gwen core initialized. Zero-Cloud constraints met.")
    while True:
        await asyncio.sleep(1)

if __name__ == '__main__':
    try:
        asyncio.run(main_loop())
    except KeyboardInterrupt:
        pass
