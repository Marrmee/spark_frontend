function toBytes32(source: string): string {
    if (!source || source.length == 0) {
      return '0x' + '0'.repeat(64);
    }
    const hexString = Buffer.from(source, 'utf8').toString('hex');
    if (hexString.length > 64) {
      throw new Error('String is too long to convert to bytes32');
    }
    return '0x' + hexString.padEnd(64, '0');
  }

export function isValidParameter(param: string): boolean {
    const validParameters = [
      toBytes32('proposalLifetime'),
      toBytes32('quorum'),
      toBytes32('voteLockTime'),
      toBytes32('proposeLockTime'),
      toBytes32('voteChangeTime'),
      toBytes32('voteChangeCutOff'),
      toBytes32('maxVotingStreak'),
      toBytes32('opThreshold'),
      toBytes32('ddThreshold'),
      toBytes32('votingRightsThreshold'),
      toBytes32('lockedTokenMultiplierBase'),
      toBytes32('maxLockedTokenMultiplier'),
    ];

    const paramBytes32 = toBytes32(param);
    return validParameters.includes(paramBytes32);
  }