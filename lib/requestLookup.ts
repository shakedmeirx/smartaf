import { ChatThread } from '@/types/chat';
import { Request, RequestDraft } from '@/types/request';

export function findPendingPairRequest(
  requests: Request[],
  parentId: string,
  babysitterId: string,
  initiatedBy: 'parent' | 'babysitter'
) {
  return (
    requests
      .filter(
        request =>
          request.status === 'pending' &&
          request.parentId === parentId &&
          request.babysitterId === babysitterId &&
          request.initiatedBy === initiatedBy
      )
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0] ?? null
  );
}

export function findPairChatThread(
  chatThreads: ChatThread[],
  parentId: string,
  babysitterId: string
) {
  return (
    chatThreads
      .filter(
        thread =>
          thread.parentId === parentId &&
          thread.babysitterId === babysitterId
      )
      .sort(
        (a, b) =>
          new Date(b.previewCreatedAt).getTime() - new Date(a.previewCreatedAt).getTime()
      )[0] ?? null
  );
}

export function requestToDraft(request: Request): RequestDraft {
  const isQuick = request.requestType === 'quick_message';

  return {
    requestType: request.requestType,
    date: isQuick ? '' : request.date,
    time: isQuick ? '' : request.time,
    numChildren: isQuick || request.numChildren <= 0 ? '' : String(request.numChildren),
    childAgeRange: isQuick ? [] : request.childAgeRange,
    area: isQuick ? '' : request.area,
    note: request.note ?? '',
  };
}
