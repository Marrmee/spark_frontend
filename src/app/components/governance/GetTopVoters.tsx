interface Vote {
  user: string;
  amount: string;
}

export const getTopVoters = async (
  index: number
) => {
  const response = await fetch(
    `/api/fetch-top-voters?proposalIndex=${index}`
  );

  if (!response.ok) {
    throw new Error(response.statusText);
  }

  const data = await response.json();
  return data.topVotersFor;
};

export default async function getTopVotersFor(
  index: number,
  setTopVotersFor: (voters: Vote[]) => void,
  setTopVotersAgainst: (voters: Vote[]) => void
): Promise<void> {
  try {
    const response = await fetch(
      `/api/fetch-top-voters?proposalIndex=${index}`
    );
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch top voters');
    }

    setTopVotersFor(data.topVotersFor);
    setTopVotersAgainst(data.topVotersAgainst);
  } catch (error) {
    console.error('Error fetching top voters:', error);
    setTopVotersFor([]);
    setTopVotersAgainst([]);
  }
}
