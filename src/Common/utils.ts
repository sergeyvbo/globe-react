const randomElement = (arr: any[]) => arr[random(arr.length)]
const random = (max: number) => Math.floor(Math.random() * max)

export { randomElement }