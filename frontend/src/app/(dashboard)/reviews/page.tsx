'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { formatDateTime, getSentimentColor } from '@/lib/utils';
import {
  Star,
  MessageSquare,
  Sparkles,
  Send,
  Flag,
  ChevronDown,
  ChevronUp,
  X,
  Copy,
  Check,
} from 'lucide-react';
import { useClientStore } from '@/store/client';

export default function ReviewsPage() {
  const queryClient = useQueryClient();
  const { selectedClient } = useClientStore();
  const [expandedReview, setExpandedReview] = useState<string | null>(null);
  const [filter, setFilter] = useState({ needsResponse: false });
  const [showResponseModal, setShowResponseModal] = useState<any>(null);
  const [responseContent, setResponseContent] = useState('');
  const [copiedSuggestion, setCopiedSuggestion] = useState<string | null>(null);

  const clientId = selectedClient?.id;

  const { data, isLoading } = useQuery({
    queryKey: ['reviews', clientId, filter],
    queryFn: () => (clientId ? api.getReviews(clientId, filter) : null),
    enabled: !!clientId,
  });

  const generateSuggestionsMutation = useMutation({
    mutationFn: (reviewId: string) => api.generateAiSuggestions(clientId!, reviewId),
    onSuccess: (suggestions, reviewId) => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      // If modal is open for this review, we could update suggestions there
    },
  });

  const createResponseMutation = useMutation({
    mutationFn: ({ reviewId, content, publish }: { reviewId: string; content: string; publish: boolean }) =>
      api.createReviewResponse(clientId!, reviewId, content, publish),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      setShowResponseModal(null);
      setResponseContent('');
    },
  });

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'fill-gray-200 text-gray-200'
            }`}
          />
        ))}
      </div>
    );
  };

  const handleUseSuggestion = (content: string) => {
    setResponseContent(content);
    setCopiedSuggestion(content);
    setTimeout(() => setCopiedSuggestion(null), 2000);
  };

  const handleOpenResponse = (review: any) => {
    setShowResponseModal(review);
    setResponseContent('');
  };

  const handleSubmitResponse = (publish: boolean) => {
    if (showResponseModal && responseContent.trim()) {
      createResponseMutation.mutate({
        reviewId: showResponseModal.id,
        content: responseContent,
        publish,
      });
    }
  };

  return (
    <div>
      <Header title="Reviews" />

      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Review Management</h2>
            <p className="text-sm text-gray-600">
              Monitor and respond to customer reviews
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={filter.needsResponse ? 'default' : 'outline'}
              onClick={() => setFilter({ ...filter, needsResponse: !filter.needsResponse })}
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              Needs Response
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-4">
            {data?.reviews?.map((review: any) => (
              <Card key={review.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                        <span className="text-lg font-medium">
                          {review.reviewerName?.[0]?.toUpperCase() || '?'}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {review.reviewerName || 'Anonymous'}
                          </span>
                          {review.sentiment && (
                            <Badge className={getSentimentColor(review.sentiment)}>
                              {review.sentiment}
                            </Badge>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          {renderStars(review.rating)}
                          <span className="text-sm text-gray-600">
                            {formatDateTime(review.publishedAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {review.needsResponse && (
                        <Badge variant="destructive">Needs Response</Badge>
                      )}
                      {review.isFlagged && (
                        <Badge variant="warning">
                          <Flag className="mr-1 h-3 w-3" />
                          Flagged
                        </Badge>
                      )}
                    </div>
                  </div>

                  {review.comment && (
                    <p className="mt-4 text-gray-700">{review.comment}</p>
                  )}

                  <div className="mt-4 flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setExpandedReview(expandedReview === review.id ? null : review.id)
                      }
                    >
                      {expandedReview === review.id ? (
                        <>
                          <ChevronUp className="mr-1 h-4 w-4" />
                          Hide Details
                        </>
                      ) : (
                        <>
                          <ChevronDown className="mr-1 h-4 w-4" />
                          Show Details
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => generateSuggestionsMutation.mutate(review.id)}
                      disabled={generateSuggestionsMutation.isPending}
                    >
                      <Sparkles className="mr-1 h-4 w-4" />
                      {generateSuggestionsMutation.isPending
                        ? 'Generating...'
                        : 'AI Suggestions'}
                    </Button>
                    <Button size="sm" onClick={() => handleOpenResponse(review)}>
                      <Send className="mr-1 h-4 w-4" />
                      Respond
                    </Button>
                  </div>

                  {expandedReview === review.id && (
                    <div className="mt-4 space-y-4 border-t pt-4">
                      {review.keywords?.length > 0 && (
                        <div>
                          <h4 className="mb-2 text-sm font-medium">Keywords</h4>
                          <div className="flex flex-wrap gap-2">
                            {review.keywords.map((keyword: string, i: number) => (
                              <Badge key={i} variant="secondary">
                                {keyword}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {review.aiSuggestions?.length > 0 && (
                        <div>
                          <h4 className="mb-2 text-sm font-medium">AI Suggestions</h4>
                          <div className="space-y-2">
                            {review.aiSuggestions.map((suggestion: any) => (
                              <div
                                key={suggestion.id}
                                className="rounded-lg border bg-gray-50 p-3"
                              >
                                <div className="mb-2 flex items-center justify-between">
                                  <Badge variant="outline">{suggestion.tone}</Badge>
                                  <span className="text-xs text-gray-500">
                                    {Math.round(suggestion.confidence * 100)}% confidence
                                  </span>
                                </div>
                                <p className="text-sm">{suggestion.content}</p>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="mt-2"
                                  onClick={() => {
                                    handleOpenResponse(review);
                                    setTimeout(() => handleUseSuggestion(suggestion.content), 100);
                                  }}
                                >
                                  Use This Response
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {review.responses?.length > 0 && (
                        <div>
                          <h4 className="mb-2 text-sm font-medium">Responses</h4>
                          {review.responses.map((response: any) => (
                            <div
                              key={response.id}
                              className="rounded-lg border bg-purple-50 p-3"
                            >
                              <p className="text-sm">{response.content}</p>
                              <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                                <Badge variant={response.isPublished ? 'success' : 'secondary'}>
                                  {response.isPublished ? 'Published' : 'Draft'}
                                </Badge>
                                {response.publishedAt && (
                                  <span>{formatDateTime(response.publishedAt)}</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {data?.reviews?.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <Star className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium">No reviews found</h3>
                  <p className="text-gray-600">
                    Reviews will appear here once synced from Google Business Profile
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Response Modal */}
        {showResponseModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
            <Card className="w-full max-w-2xl">
              <CardContent className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Respond to Review</h2>
                  <Button variant="ghost" size="sm" onClick={() => setShowResponseModal(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Original Review */}
                <div className="mb-4 rounded-lg border bg-gray-50 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium">{showResponseModal.reviewerName || 'Anonymous'}</span>
                    {renderStars(showResponseModal.rating)}
                  </div>
                  <p className="text-sm text-gray-700">{showResponseModal.comment}</p>
                </div>

                {/* AI Suggestions */}
                {showResponseModal.aiSuggestions?.length > 0 && (
                  <div className="mb-4">
                    <h4 className="mb-2 text-sm font-medium">AI Suggestions</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {showResponseModal.aiSuggestions.map((suggestion: any) => (
                        <div
                          key={suggestion.id}
                          className="flex items-start justify-between rounded-lg border bg-gray-50 p-3"
                        >
                          <div className="flex-1">
                            <Badge variant="outline" className="mb-1">{suggestion.tone}</Badge>
                            <p className="text-sm line-clamp-2">{suggestion.content}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleUseSuggestion(suggestion.content)}
                          >
                            {copiedSuggestion === suggestion.content ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Response Input */}
                <div className="mb-4">
                  <label className="text-sm font-medium">Your Response</label>
                  <textarea
                    className="mt-1 h-32 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
                    value={responseContent}
                    onChange={(e) => setResponseContent(e.target.value)}
                    placeholder="Write your response here..."
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowResponseModal(null)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleSubmitResponse(false)}
                    disabled={!responseContent.trim() || createResponseMutation.isPending}
                    className="flex-1"
                  >
                    Save as Draft
                  </Button>
                  <Button
                    onClick={() => handleSubmitResponse(true)}
                    disabled={!responseContent.trim() || createResponseMutation.isPending}
                    className="flex-1"
                  >
                    {createResponseMutation.isPending ? 'Publishing...' : 'Publish Response'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
