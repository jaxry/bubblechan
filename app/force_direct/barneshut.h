#ifndef BARNESHUT_H
#define BARNESHUT_H

typedef struct bh_tree bh_tree;

bh_tree* new_tree(point, point);

int insert(bh_tree*, point);

void delete_tree(bh_tree*);

void compute_force(bh_tree*, point, point*);

#endif