
export class LiveManager {
    constructor(io){
        this.io = io;
        this.messages = [];

        io.on("connection", (socket) => {
            // update socket on all of the games
            // in the future, the socket should be able to choose which games to listen to
            for (let i = 0; i < this.messages.length; i++){
                const msgs = this.messages[i];
                if (msgs){
                    for (const msg of msgs)
                        socket.emit(`game${i}`, msg);
                }
            }
        });
    }

    setScheduler(scheduler){
        this.messages = [];
        scheduler.addGameListener((msg) => this.#receiveMessage(msg));
    }

    #receiveMessage(msg){
        console.log(msg);
        const id = msg.threadId;
        if (!this.messages[id])
            this.messages[id] = [];

        this.io.emit(`game${id}`, msg);

        this.messages[id].push(msg);

        if (msg.type == "result")
            delete this.messages[id];
    }
}
