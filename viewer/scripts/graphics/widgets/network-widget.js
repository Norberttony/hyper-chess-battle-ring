
// The network widget handles continuously updating the game with recent information from the server

class NetworkWidget extends BoardWidget {
    constructor(boardgfx, location = WIDGET_LOCATIONS.RIGHT){
        super(boardgfx, "Network");

        this.active = false;
    }
}
