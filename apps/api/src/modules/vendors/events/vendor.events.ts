import { BaseEvent } from '../../../common/events/base.event';

interface VendorEventActor {
  actorId: string;
  actorEmail: string;
  organizationId: string;
  correlationId?: string | null;
}

export class VendorCreatedEvent extends BaseEvent {
  readonly vendorId: string;
  readonly vendorCode: string;
  readonly companyName: string;

  constructor(
    actor: VendorEventActor,
    payload: { vendorId: string; vendorCode: string; companyName: string },
  ) {
    super(actor);
    this.vendorId = payload.vendorId;
    this.vendorCode = payload.vendorCode;
    this.companyName = payload.companyName;
  }
}

export class VendorUpdatedEvent extends BaseEvent {
  readonly vendorId: string;
  readonly changedFields: string[];

  constructor(actor: VendorEventActor, payload: { vendorId: string; changedFields: string[] }) {
    super(actor);
    this.vendorId = payload.vendorId;
    this.changedFields = payload.changedFields;
  }
}

export class VendorDeletedEvent extends BaseEvent {
  readonly vendorId: string;

  constructor(actor: VendorEventActor, payload: { vendorId: string }) {
    super(actor);
    this.vendorId = payload.vendorId;
  }
}

export class VendorStatusChangedEvent extends BaseEvent {
  readonly vendorId: string;
  readonly fromStatus: string;
  readonly toStatus: string;

  constructor(
    actor: VendorEventActor,
    payload: { vendorId: string; fromStatus: string; toStatus: string },
  ) {
    super(actor);
    this.vendorId = payload.vendorId;
    this.fromStatus = payload.fromStatus;
    this.toStatus = payload.toStatus;
  }
}

export class VendorNoteAddedEvent extends BaseEvent {
  readonly vendorId: string;
  readonly noteId: string;
  readonly noteType: string;

  constructor(
    actor: VendorEventActor,
    payload: { vendorId: string; noteId: string; noteType: string },
  ) {
    super(actor);
    this.vendorId = payload.vendorId;
    this.noteId = payload.noteId;
    this.noteType = payload.noteType;
  }
}

export class VendorContactAddedEvent extends BaseEvent {
  readonly vendorId: string;
  readonly contactId: string;
  readonly isPrimary: boolean;

  constructor(
    actor: VendorEventActor,
    payload: { vendorId: string; contactId: string; isPrimary: boolean },
  ) {
    super(actor);
    this.vendorId = payload.vendorId;
    this.contactId = payload.contactId;
    this.isPrimary = payload.isPrimary;
  }
}

export class VendorContactUpdatedEvent extends BaseEvent {
  readonly vendorId: string;
  readonly contactId: string;

  constructor(actor: VendorEventActor, payload: { vendorId: string; contactId: string }) {
    super(actor);
    this.vendorId = payload.vendorId;
    this.contactId = payload.contactId;
  }
}

export class VendorContactRemovedEvent extends BaseEvent {
  readonly vendorId: string;
  readonly contactId: string;

  constructor(actor: VendorEventActor, payload: { vendorId: string; contactId: string }) {
    super(actor);
    this.vendorId = payload.vendorId;
    this.contactId = payload.contactId;
  }
}
