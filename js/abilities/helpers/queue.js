export function moveCard(
    queue,
    from,
    to
){

    const card =
        queue.splice(from,1)[0];

    queue.splice(
        to,
        0,
        card
    );

}

export function swapCards(
    queue,
    a,
    b
){

    [
        queue[a],
        queue[b]
    ] =
    [
        queue[b],
        queue[a]
    ];

}