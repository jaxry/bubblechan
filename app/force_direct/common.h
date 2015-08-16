#ifndef COMMON_H
#define COMMON_H

typedef struct
{
    float x, y;
} point;

typedef struct 
{
    float x, y, dist;
} distance;

static inline distance direction(point p1, point p2)
{
    distance d;
    d.x = p2.x - p1.x;
    d.y = p2.y - p1.y;
    d.dist = sqrtf(d.x * d.x + d.y * d.y);
    
    if (d.dist != 0) 
    {
        d.x /= d.dist;
        d.y /= d.dist;
    } 
    
    return d;
}

#endif