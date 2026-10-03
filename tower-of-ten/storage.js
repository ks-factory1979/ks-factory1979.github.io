// GitHub Pages apps share one origin. Reset only this game's stored values.
function clearTowerOfTenStoredData() {
  const keys = [
    'soundOn', 'hintOn', 'timeLimit', 'boardCols', 'boardRows', 'numRange', 'customNumbers',
    'bestTowers', 'bestTowerProgress', 'bestTen', 'bestChain',
    'falling3minBestTotalBricks', 'falling3minBestMaxChain', 'falling3minBestChainBonus',
    'pairFalling3minRecordV1', 'tenTowerBattleDiagnosticQueueV211',
    'tenTowerBattleResumeV211', 'tenTowerBattleTokenV211'
  ];
  for (let index = 0; index < localStorage.length; index++) {
    const key = localStorage.key(index);
    if (key && key.startsWith('tenTowerBattleSequenceV213:')) keys.push(key);
  }
  keys.forEach(key => localStorage.removeItem(key));
  sessionStorage.removeItem('tenTowerBattleToken');
}
