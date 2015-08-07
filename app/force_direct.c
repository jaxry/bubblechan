#include <stdio.h>
#include <unistd.h> 
#include <string.h>
#include <stdlib.h>
#include <time.h>
#include <math.h>

#define ITERATIONS 5000
#define START_TEMP 1
#define STOP_TEMP 0.1

struct args {
    char *nodes, *edges;
};

typedef struct 
{
    float x, y, dx, dy;
} node;

typedef struct 
{
    node *pnt;
    size_t size;
} nodes;

typedef struct {
    node *parent, *child;
} edge;

typedef struct {
    edge *pnt;
    size_t size;
} edges;

typedef struct {
    float x, y, dist;
} distance;

distance direction(node *node1, node *node2)
{
    distance d;
    d.x = node2->x - node1->x;
    d.y = node2->y - node1->y;
    d.dist = sqrtf(d.x * d.x + d.y * d.y);
    d.x /= d.dist;
    d.y /= d.dist;

    return d;
}

struct args process_args(int argc, char *argv[])
{
    struct args args;
    int c;
    while ( (c = getopt(argc, argv, "n:e:")) != -1 )
    {
        switch (c)
        {
            case 'e':
                args.edges = optarg;
                break;
            case 'n':
                args.nodes = optarg;
                break;
        }
    }
    return args;
}

nodes create_nodes(char *node_arg) 
{
    nodes nodes;

    size_t nodes_length = strtol(node_arg, NULL, 10);

    nodes.pnt = malloc(nodes_length * sizeof(node));
    nodes.size = nodes_length;

    float canvas_range = 2;
    for (int i = 0; i < nodes_length; i++) 
    {
        nodes.pnt[i].x = (float) rand() / (float) RAND_MAX * canvas_range - canvas_range / 2;
        nodes.pnt[i].y = (float) rand() / (float) RAND_MAX * canvas_range - canvas_range / 2;
    }
    return nodes;
}


edges create_edges(char *edge_arg, nodes nodes)
{

    edges edges;

    // the first number in edge_arg specifies the # of edges.
    char *token = strtok(edge_arg, "[");
    size_t edges_length = strtol(token, NULL, 10);
    
    edges.pnt = malloc(edges_length * sizeof(edge));
    edges.size = edges_length;

    for (int i = 0; i < edges_length; i++)
    {
        size_t parent_index = strtol(strtok(NULL, "-"), NULL, 10);
        size_t child_index = strtol(strtok(NULL, ";"), NULL, 10);

        edges.pnt[i].parent = &nodes.pnt[parent_index];
        edges.pnt[i].child = &nodes.pnt[child_index];
    }
    return edges;
}

void output_graph(nodes nodes)
{
    for (int i = 0; i < nodes.size; i++) 
    {
        printf("%f,%f;", nodes.pnt[i].x, nodes.pnt[i].y);
    }
}


// a simplified simulation based on Fruchterman and Reingold's "Graph Drawing by Force-directed Placement"
void force_direct(nodes nodes, edges edges) 
{
    float temperature = START_TEMP;
    float decay = (temperature - STOP_TEMP) / ITERATIONS;
    // float gravity = 1 / (sqrtf(nodes.size) * 500);

    for (int i = 0; i < ITERATIONS; i++)
    {
        for (int n = 0; n < nodes.size; n++) 
        {
            nodes.pnt[n].dx = 0; nodes.pnt[n].dy = 0;
        }

        for (int n = 0; n < nodes.size; n++)
        {
            for (int p = n + 1; p < nodes.size; p++)
            {
                distance dir = direction(&nodes.pnt[n], &nodes.pnt[p]);
                float r = 1 / dir.dist; // repulsive force
                nodes.pnt[n].dx -= dir.x * r; nodes.pnt[n].dy -= dir.y * r;
                nodes.pnt[p].dx += dir.x * r; nodes.pnt[p].dy += dir.y * r;
            }
        }

        for (int e = 0; e < edges.size; e++) 
        {
            distance dir = direction(edges.pnt[e].parent, edges.pnt[e].child);
            float a = dir.dist * dir.dist; // attractive force
            edges.pnt[e].parent->dx += dir.x * a; edges.pnt[e].parent->dy += dir.y * a;
            edges.pnt[e].child->dx -= dir.x * a; edges.pnt[e].child->dy -= dir.y * a;
        }
        
        for (int n = 0; n < nodes.size; n++)
        {

            // float center = sqrtf(nodes.pnt[n].x * nodes.pnt[n].x + nodes.pnt[n].y * nodes.pnt[n].y) * gravity;
            // nodes.pnt[n].dx -= nodes.pnt[n].x * center; 
            // nodes.pnt[n].dy -= nodes.pnt[n].y * center;

            float disp = sqrtf(nodes.pnt[n].dx * nodes.pnt[n].dx + nodes.pnt[n].dy * nodes.pnt[n].dy);
            nodes.pnt[n].x += nodes.pnt[n].dx * fminf(temperature, disp) / disp;
            nodes.pnt[n].y += nodes.pnt[n].dy * fminf(temperature, disp) / disp;
        }

        temperature = fmaxf(temperature -= decay, STOP_TEMP);
    }
}

int main(int argc, char *argv[])
{
    srand(time(NULL));

    struct args args = process_args(argc, argv);
    nodes nodes = create_nodes(args.nodes);
    edges edges = create_edges(args.edges, nodes);
    force_direct(nodes, edges);
    output_graph(nodes);
    return 0;
}