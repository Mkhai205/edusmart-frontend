export function createCanvas() {
    return {
        getContext: () => null,
    };
}

const canvasStub = {
    createCanvas,
};

export default canvasStub;
