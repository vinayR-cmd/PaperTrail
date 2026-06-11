import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 300000,
  headers: { 'Content-Type': 'application/json' }
})

console.log("VITE_API_URL =", import.meta.env.VITE_API_URL);
console.log("Axios baseURL =", api.defaults.baseURL);

export const searchAPI = {
  semanticSearch: (query, topicSlug, nResults = 10) =>
    api.post('/search', { query, topic_slug: topicSlug, n_results: nResults }),

  findGaps: (topicSlug, minScore = 15) =>
    api.post('/search/gaps', { topic_slug: topicSlug, min_score: minScore }),

  getGapSummary: (topicSlug) =>
    api.get(`/search/gaps/${topicSlug}/summary`),

  generateBrief: (gap) =>
    api.post('/search/generate-brief', { gap }),

  findInterdisciplinaryGaps: (topicA, topicB, maxPapers = 1000) =>
    api.post('/search/interdisciplinary', {
      topic_a: topicA,
      topic_b: topicB,
      max_papers: maxPapers
    }),
}

export const indexAPI = {
  indexTopic: (topic, maxPapers = 1000) =>
    api.post('/index/topic', { topic, max_papers: maxPapers }),

  embedTopic: (topicSlug) =>
    api.post('/index/embed', { topic_slug: topicSlug }),

  buildCitationEdges: (topicSlug) =>
    api.post('/index/citation-edges', { topic_slug: topicSlug }),

  listTopics: () =>
    api.get('/index/topics'),

  getStatus: (topicSlug) =>
    api.get(`/index/status/${topicSlug}`),

  getChromaStats: () =>
    api.get('/index/chroma-stats'),

  checkFreshness: (topicSlug) =>
    api.get(`/index/freshness/${topicSlug}`),

  refreshTopic: (topicSlug, force = false) =>
    api.post('/index/refresh', { 
      topic_slug: topicSlug, 
      force 
    }),

  getAdminSearchHistory: () =>
    api.get('/index/admin/search-history'),

  getAdminSavedGaps: () =>
    api.get('/index/admin/saved-gaps'),

  getAdminOverviewStats: () =>
    api.get('/index/admin/overview-stats'),

  getAdminGapCache: () =>
    api.get('/index/admin/gap-cache'),

  getAdminProfiles: () =>
    api.get('/index/admin/profiles'),

  getAdminContradictions: () =>
    api.get('/index/admin/contradictions'),
}

export default api