'use server';

import { ProposalSubType } from '@/app/utils/interfaces';

const cache: { [key: string]: ProposalSubType | undefined } = {};

export const fetchProposalDetails = async (link: string) => {
  // Check if the data is already in the cache
  if (cache[link]) {
    return cache[link];
  }

  try {
    const response = await fetch(`${link}`, { cache: 'force-cache' });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const jsonData = (await response.json()) as ProposalSubType;

    // Store the response in the cache
    cache[link] = jsonData;

    return jsonData;
  } catch (err) {
    const error = JSON.parse(JSON.stringify(err));
    console.log(error);
  }
};
