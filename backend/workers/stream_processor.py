import redis
import json
import time
from datetime import datetime
import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Redis client
redis_client = redis.Redis(
    host='localhost',
    port=6379,
    decode_responses=True
)

def process_code_analysis(message_data):
    """
    Process code analysis from Redis Stream
    """
    print(f"Processing analysis: {message_data.get('analysis_id')}")
    
    # Extract data
    code = message_data.get('code')
    language = message_data.get('language')
    file_path = message_data.get('file_path')
    
    # Here we would call the ML model
    # For now, just log it
    print(f"  File: {file_path}")
    print(f"  Language: {language}")
    print(f"  Code length: {len(code)} characters")
    
    # Store result in Redis
    result = {
        'analysis_id': message_data.get('analysis_id'),
        'status': 'completed',
        'processed_at': datetime.utcnow().isoformat(),
        'vulnerabilities_found': 0
    }
    
    redis_client.setex(
        f"result:{message_data.get('analysis_id')}",
        3600,
        json.dumps(result)
    )
    
    print(f"  ✓ Analysis completed")

def main():
    """
    Main worker loop - processes Redis Stream
    """
    print("🚀 Stream Processor Worker started")
    print("📊 Listening for code analysis requests...")
    
    # Create consumer group if it doesn't exist
    try:
        redis_client.xgroup_create(
            'code_analysis_stream',
            'analysis_workers',
            id='0',
            mkstream=True
        )
        print("✓ Consumer group created")
    except redis.exceptions.ResponseError as e:
        if "BUSYGROUP" in str(e):
            print("✓ Consumer group already exists")
        else:
            raise
    
    # Consumer name
    consumer_name = f"worker_{os.getpid()}"
    
    while True:
        try:
            # Read from stream
            messages = redis_client.xreadgroup(
                'analysis_workers',
                consumer_name,
                {'code_analysis_stream': '>'},
                count=10,
                block=1000  # Block for 1 second
            )
            
            if messages:
                for stream_name, message_list in messages:
                    for message_id, message_data in message_list:
                        print(f"\n📨 New message: {message_id}")
                        
                        # Process the message
                        process_code_analysis(message_data)
                        
                        # Acknowledge message
                        redis_client.xack(
                            'code_analysis_stream',
                            'analysis_workers',
                            message_id
                        )
                        
        except KeyboardInterrupt:
            print("\n⚠️  Worker stopping...")
            break
        except Exception as e:
            print(f"❌ Error: {str(e)}")
            time.sleep(1)
    
    print("👋 Worker stopped")

if __name__ == "__main__":
    main()