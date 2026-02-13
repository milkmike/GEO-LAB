export function relationLabel(relation: string): string {
  const map: Record<string, string> = {
    has_narratives: 'переход к связанным сюжетам',
    has_articles: 'переход к связанным статьям',
    has_channels: 'переход к каналам',
    has_comments: 'переход к комментариям',
    has_temperature: 'переход к динамике напряжения',
    has_events: 'переход к важным событиям',
    contains_articles: 'в этом сюжете есть статья',
    published_by: 'эту статью выпустил канал',
    belongs_to_narrative: 'эта статья относится к сюжету',
    comments_on: 'комментарий к статье',
    spans_countries: 'сюжет касается страны',
    spans_country: 'сюжет касается страны',
    related_to_narrative: 'связано с этим сюжетом',
    'related to narrative': 'связано с этим сюжетом',
    'spans country': 'сюжет касается страны',
    triggered_by: 'сюжет возник из события',
    about_country: 'материал о стране',
    signal_deck_open_case: 'открыт главный сюжет',
    signal_deck_next_case: 'открыт следующий сюжет',
    signal_deck_pick: 'выбран сюжет из списка',
  };

  return map[relation] || relation.replaceAll('_', ' ');
}

export function narrativeStatusLabel(status: string): string {
  if (status === 'active') return 'активно обсуждается';
  if (status === 'fading') return 'обсуждение стихает';
  if (status === 'resolved') return 'тема в основном завершена';
  return status;
}

export function entityKindLabel(kind: string): string {
  if (kind === 'person') return 'человек';
  if (kind === 'org') return 'организация';
  if (kind === 'place') return 'место';
  if (kind === 'event') return 'событие';
  return kind;
}
