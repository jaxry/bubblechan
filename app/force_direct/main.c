#include <stdio.h>
#include <unistd.h> 
#include <string.h>
#include <stdlib.h>
#include <time.h>
#include <math.h>
#include "common.h"
#include "barneshut.h"

#define ITERATIONS 2500
#define START_TEMP 1
#define STOP_TEMP 0.2
#define USE_TREE_AT_NODE_COUNT 175

struct args 
{
    char *nodes, *edges;
};

typedef struct 
{
    point p;
    point d;
} node;

typedef struct 
{
    node *pnt;
    size_t size;
    point min_bound;
    point max_bound;
} nodes;

typedef struct 
{
    node *parent, *child;
} edge;

typedef struct 
{
    edge *pnt;
    size_t size;
} edges;

void clearBounds(nodes *nodes) 
{
    nodes->min_bound.x = 0;
    nodes->min_bound.y = 0;
    nodes->max_bound.x = 0;
    nodes->max_bound.y = 0;
}

void updateBounds(nodes *nodes, point p) 
{
    if (p.x < nodes->min_bound.x) nodes->min_bound.x = p.x;
    else if (p.x > nodes->max_bound.x) nodes->max_bound.x = p.x;

    if (p.y < nodes->min_bound.y) nodes->min_bound.y = p.y;
    else if (p.y > nodes->max_bound.y) nodes->max_bound.y = p.y;
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
        nodes.pnt[i].p.x = (float) rand() / (float) RAND_MAX * canvas_range - canvas_range / 2;
        nodes.pnt[i].p.y = (float) rand() / (float) RAND_MAX * canvas_range - canvas_range / 2;
        updateBounds(&nodes, nodes.pnt[i].p);
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
        printf("%.9g,%.9g;", nodes.pnt[i].p.x, nodes.pnt[i].p.y);
    }
}

// a simplified simulation based on Fruchterman and Reingold's "Graph Drawing by Force-directed Placement"
// tree optimization based on Quigley and Eades' "FADE: Graph drawing, clustering and visual abstraction"
void force_direct(nodes nodes, edges edges, int use_tree) 
{
    float temperature = START_TEMP;
    float decay = (temperature - STOP_TEMP) / ITERATIONS;

    bh_tree *t;

    for (int i = 0; i < ITERATIONS; i++)
    {
        if (use_tree) t = new_tree(nodes.min_bound, nodes.max_bound);

        for (int n = 0; n < nodes.size; n++) 
        {
            nodes.pnt[n].d.x = 0; nodes.pnt[n].d.y = 0;
        
            if (use_tree) insert(t, nodes.pnt[n].p);
        }

        for (int n = 0; n < nodes.size; n++)
        {
            if (use_tree) compute_force(t, nodes.pnt[n].p, &nodes.pnt[n].d);
            else 
            {
                for (int p = n + 1; p < nodes.size; p++)
                {
                    distance dir = direction(nodes.pnt[n].p, nodes.pnt[p].p);
                    float r = 1 / dir.dist; // repulsive force
                    nodes.pnt[n].d.x -= dir.x * r; nodes.pnt[n].d.y -= dir.y * r;
                    nodes.pnt[p].d.x += dir.x * r; nodes.pnt[p].d.y += dir.y * r;
                }
            }
        }

        for (int e = 0; e < edges.size; e++) 
        {
            distance dir = direction(edges.pnt[e].parent->p, edges.pnt[e].child->p);
            float a = dir.dist * dir.dist; // attractive force

            edges.pnt[e].parent->d.x += dir.x * a; edges.pnt[e].parent->d.y += dir.y * a;
            edges.pnt[e].child->d.x -= dir.x * a; edges.pnt[e].child->d.y -= dir.y * a;
        }
        
        if (use_tree) clearBounds(&nodes);

        for (int n = 0; n < nodes.size; n++)
        {
            float disp = sqrtf(nodes.pnt[n].d.x * nodes.pnt[n].d.x + nodes.pnt[n].d.y * nodes.pnt[n].d.y);
            nodes.pnt[n].p.x += nodes.pnt[n].d.x * fminf(temperature, disp) / disp;
            nodes.pnt[n].p.y += nodes.pnt[n].d.y * fminf(temperature, disp) / disp;
            if (use_tree) updateBounds(&nodes, nodes.pnt[n].p);
        }

        temperature = fmaxf(temperature -= decay, STOP_TEMP);

        if (use_tree) delete_tree(t);
    }
}

int main(int argc, char *argv[])
{
    srand(time(NULL));

    struct args args = process_args(argc, argv);
    nodes nodes = create_nodes(args.nodes);
    edges edges = create_edges(args.edges, nodes);
    force_direct(nodes, edges, nodes.size > USE_TREE_AT_NODE_COUNT);
    output_graph(nodes);

    return 0;
}