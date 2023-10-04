export const assertBytes = (data: string): string[] => {
  const dataList = data.split(",");

  if (dataList.length < 1) {
    throw new Error("No datas provided");
  }

  for (const data of dataList) {
    if (!data.startsWith("0x")) {
      throw new Error(`Account ${data} does not start with '0x'`);
    }
  }

  return dataList;
};

export const assertNumbers = (nums: string): string[] => {
  const numList = nums.split(",");

  if (numList.length < 1) {
    throw new Error("No num provided");
  }

  for (const num of numList) {
    if (isNaN(Number(num))) {
      throw new Error(`Amount ${num} is not a valid number`);
    }
  }

  return numList;
};
