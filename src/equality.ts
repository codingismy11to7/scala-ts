import { hash, is } from "immutable";

export type EqualityFunc = (a: any, b: any) => boolean;

export const defaultEquality = is;

let equalityFunc: EqualityFunc = defaultEquality;

export const equalityFunction = () => equalityFunc;

export const setEqualityFunction = (ef: EqualityFunc) => {
  equalityFunc = ef;
};

export type HashFunc = (item: any) => number;

export const defaultHash = hash;

let hashFunc: HashFunc = defaultHash;

export const hashItems = (...items: any[]) => {
  const h = hashFunction();
  let result = 1;
  items.forEach(item => {
    result = 31 * result + h(item);
  });
  return result;
};

export const hashFunction = () => hashFunc;

export const setHashFunction = (hf: HashFunc) => {
  hashFunc = hf;
};
