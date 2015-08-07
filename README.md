# Bubblechan 
A highly experimental, two dimensional 4chan reader.

---

## What is it?
Bubblechan explores the possibility of browsing an imageboard in full 2D. To do this, Bubblechan presents a thread as a [graph](https://en.wikipedia.org/wiki/Graph_%28mathematics%29). Posts are displayed as nodes in that graph and replies to a post are expressed as edge connections. A [force-directed simulation](https://en.wikipedia.org/wiki/Force-directed_graph_drawing) is iterated to position the nodes in two-dimensional space. At this point the user may read the resulting graph.

Bubblechan is a web app. The force-directed graph is computed on a server before it is served to a web browser. Currently, Bubblechan supports only the reading of threads from 4chan.

**Disclaimer:** Bubblechan is still at an extremely early stage of development and is nothing more than a proof-of-concept at this point. With your interest, the app will continue to grow and may eventually prove to be a viable alternative to traditional imageboard browsing.

---

## Quick Server Setup
### Dependencies
`gcc` , `nodejs` and `npm` are required on the server running Bubblechan.
### Install
1. Navigate a terminal to the Bubblechan directory.
2. Run  `npm install`. This will download the necessary npm modules.
3. Run `npm run build`. Gcc will compile the force-directed simulation program.
4. Run `npm start`. The server is up and you can now connect to it on port 3000.

## How To Use
Visit http://localhost:3000/board/`board_letter` to load a catalog for the specified 4chan board.
(For instance, http://localhost:3000/board/g/ loads the Technology board.)

### What Am I Seeing?
#### Legend
+ **White Node**: the OP post
+ **Blue Nodes**: posts which are replies to other posts
+ **Orange Nodes**: standalone posts which are _not_ replies.

#### Controls
Navigate the graph with the mouse.

+ **Mouse button**: Click to jump, hold to pan.
+ **Mouse wheel**: Zoom the graph. 
+ **Space**: Reset zoom to default. Pressing space again zooms the graph out fully.

Hovering over a node expands the node, making the full post visible.

Bubblechan also works with a touchscreen.

## Contributing
If you like the idea of Bubblechan and would like to see the app grow, any bit of your effort is appreciated and welcomed. In the case that you have feedback, criticism, or ideas for the app, please considering visiting the **Issues** tab and sharing your thoughts. Bubblechan is in active development and your feedback will be put to good use.
