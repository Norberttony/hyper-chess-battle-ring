import { Server } from "socket.io";
import { Scheduler } from "../tournament/scheduler";
import { ArbiterMessage } from "../tournament/arbiter";

export class LiveManager {
    private messages: ArbiterMessage[][];

    constructor(private io: Server){
        this.messages = [];

        io.on("connection", (socket) => {
            // update socket on all of the games
            // in the future, the socket should be able to choose which games to listen to
            for (let i = 0; i < this.messages.length; i++){
                const msgs = this.messages[i];
                if (msgs){
                    for (const msg of msgs)
                        socket.emit(`game`, i, msg);
                }
            }
        });
    }

    public setScheduler(scheduler: Scheduler): void {
        this.messages = [];
        scheduler.addGameListener((msg: ArbiterMessage) => this.receiveMessage(msg));
    }

    private receiveMessage(msg: ArbiterMessage){
        const id = msg.threadId;
        if (!id)
            throw new Error("Expected threadId on received ArbiterMessage");

        if (!this.messages[id])
            this.messages[id] = [];

        this.io.emit(`game`, id, msg);

        this.messages[id].push(msg);

        if (msg.type == "result")
            delete this.messages[id];
    }
}
