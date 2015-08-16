#include <stdio.h>
#include <stdlib.h>
#include <math.h>
#include "common.h"

typedef struct 
{
    point center;
    float half_width;
} box;

typedef struct bh_tree
{
    point body;
    int bodyPresent;

    int mass;
    point center_of_mass;
    int center_of_mass_computed;

    box boundary;

    struct bh_tree *nw;
    struct bh_tree *ne;
    struct bh_tree *sw;
    struct bh_tree *se;

} bh_tree;

int contains_point(box b, point p) 
{
    return fabsf(p.x - b.center.x) <= b.half_width && fabsf(p.y - b.center.y) <= b.half_width;
}

bh_tree* make_tree(float x, float y, float half_width)
{
    bh_tree *t = malloc(sizeof(bh_tree));

    t->boundary.half_width = half_width;
    t->boundary.center.x = x;
    t->boundary.center.y = y;
    t->nw = 0;
    t->mass = 0;
    t->center_of_mass.x = 0;
    t->center_of_mass.y = 0;
    t->center_of_mass_computed = 0;
    t->bodyPresent = 0;

    return t;
}

void subdivide(bh_tree *t)
{
    point c = t->boundary.center;
    float hd = t->boundary.half_width / 2;
    
    t->nw = make_tree(c.x - hd, c.y + hd, hd);
    t->ne = make_tree(c.x + hd, c.y + hd, hd);
    t->sw = make_tree(c.x - hd, c.y - hd, hd);
    t->se = make_tree(c.x + hd, c.y - hd, hd);
}

int find_quadrant(bh_tree *t, point p)
{
    if (insert(t->nw, p)) return 1;
    if (insert(t->ne, p)) return 1;
    if (insert(t->sw, p)) return 1;
    if (insert(t->se, p)) return 1;
}

int insert(bh_tree *t, point p)
{

    if (!contains_point(t->boundary, p)) return 0;

    t->mass++;
    t->center_of_mass.x += p.x;
    t->center_of_mass.y += p.y;
    
    if (!t->bodyPresent) 
    {
        t->body = p;
        t->bodyPresent = 1;
        return 1;
    }

    if (t->nw == 0) 
    {
        subdivide(t);
        find_quadrant(t, t->body);
    }

    return find_quadrant(t, p);
}

void delete_tree(bh_tree *t)
{
    if (t->nw != 0) 
    {
        delete_tree(t->nw);
        delete_tree(t->ne);
        delete_tree(t->sw);
        delete_tree(t->se);
    }

    free(t);
}

void compute_force(bh_tree *t, point p, point *dp)
{
    if (!t->bodyPresent) return;

    if (!t->center_of_mass_computed)
    {
        t->center_of_mass.x /= t->mass;
        t->center_of_mass.y /= t->mass;
        t->center_of_mass_computed = 1;
    }

    distance d = direction(t->center_of_mass, p);
    
    if (d.dist == 0) return;
    
    if (t->nw == 0 || t->boundary.half_width / d.dist < 0.5)
    {
        dp->x += d.x * t->mass / d.dist;
        dp->y += d.y * t->mass / d.dist;
        return;
    }

    compute_force(t->nw, p, dp);
    compute_force(t->ne, p, dp);
    compute_force(t->sw, p, dp);
    compute_force(t->se, p, dp);
}

bh_tree* new_tree(point min_bound, point max_bound) 
{
    return make_tree((min_bound.x + max_bound.x) / 2, 
                     (min_bound.y + max_bound.y) / 2,
                     fmaxf(fabsf(max_bound.x - min_bound.x), fabsf(max_bound.y - min_bound.y)) / 2);

}