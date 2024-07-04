const randomElement = (arr: any[]) => arr[random(arr.length)]
const random = (max: number) => Math.floor(Math.random() * max)

const shuffleArray = (array: any[]) => {
    return array.sort(() => Math.random() - 0.5);
};

const kebabize = (str: string) => str.replace(/[A-Z]+(?![a-z])|[A-Z]/g, ($, ofs) => (ofs ? "-" : "") + $.toLowerCase())

export { random, randomElement, shuffleArray, kebabize }