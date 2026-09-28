export const calculateCredibility = (incident, reporter = null) => {
  let score = 50;

  if (reporter) {
    score += Math.min(reporter.credibilityScore - 50, 20);
    if (reporter.isPhoneVerified) score += 10;
    if (reporter.isEmailVerified) score += 5;
  }

  if (incident.media?.length > 0) score += 15;
  if (incident.media?.length > 1) score += 5;
  if (incident.description?.length > 50) score += 5;
  if (incident.isAnonymous) score -= 10;

  const mediaWithGeo = incident.media?.filter(
    (m) => m.metadata?.latitude && m.metadata?.longitude
  );
  if (mediaWithGeo?.length > 0) score += 10;

  return Math.max(0, Math.min(100, score));
};

export const updateUserCredibility = async (userId, delta, User) => {
  const user = await User.findById(userId);
  if (!user) return;
  user.credibilityScore = Math.max(0, Math.min(100, user.credibilityScore + delta));
  await user.save();
};
