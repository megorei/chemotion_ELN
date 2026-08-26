# frozen_string_literal: true

class InboxService
  def initialize(container)
    @container = container
  end

  def to_hash(device_boxes, sort_params, full_response = true)
    # A user without an inbox container (external guests are provisioned
    # without one - REQ-ELN-16/18) gets an empty inbox instead of a
    # NoMethodError 500. The empty case must NOT fall through to the queries
    # below: `created_for: @container&.containable&.id` would resolve to
    # created_for NULL and match other people's orphaned attachments.
    return { inbox: empty_inbox(full_response) } if @container.nil?

    inbox = { unlinked_attachments: unlinked_attachments(sort_params), inbox_count: inbox_count }
    if full_response
      inbox = {
        children: device_boxes,
        count: @container.children.size,
        container_type: @container.container_type,
      }.merge(inbox)
    end
    { inbox: inbox }
  end

  private

  def unlinked_attachments(sort_params)
    Attachment.where(
      attachable_type: 'Container',
      attachable_id: nil,
      created_for: @container.containable&.id,
    ).order("#{sort_params[:sort_column]} #{sort_params[:sort_direction]}")
  end

  def inbox_count
    Container.where(id: @container.descendant_ids)
             .joins(children: :attachments)
             .count('attachments.id')
  end

  def empty_inbox(full_response)
    base = { unlinked_attachments: Attachment.none, inbox_count: 0 }
    return base unless full_response

    { children: [], count: 0, container_type: 'inbox' }.merge(base)
  end
end
