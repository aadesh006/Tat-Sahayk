import asyncio
import websockets
import json

async def test_websocket():
    uri = "ws://localhost:8000/ws"
    
    print("Connecting to WebSocket")
    
    async with websockets.connect(uri) as websocket:
        print(" Connected to WebSocket")
        
        await websocket.send("ping")
        response = await websocket.recv()
        print(f"Ping response: {response}")
        
        print("\nListening for real-time updates")
        print("(Trigger reports via API to see updates here)")
        
        try:
            while True:
                message = await websocket.recv()
                data = json.loads(message)
                
                print(f"\n")
                print(f"\n")
                print(f"\n")
                print(f"Received: {data['type']}")
                print(f"\n")
                print(f"\n")
                print(f"\n")
                print(json.dumps(data, indent=2))
        
        except KeyboardInterrupt:
            print("\n\nDisconnecting")

if __name__ == "__main__":
    asyncio.run(test_websocket())